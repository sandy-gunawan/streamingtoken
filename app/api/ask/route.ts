import type { NextRequest } from "next/server";
import { retrieveGrounding } from "@/lib/search";
import {
  getOpenAIClient,
  getDeployment,
  buildMessages,
  SHARED_PARAMS,
} from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { question } = (await req.json()) as { question?: string };

  if (!question || !question.trim()) {
    return new Response(JSON.stringify({ error: "Question is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );

      try {
        // 1) Agentic retrieval runs once; both panels share this grounding.
        const retrieval = await retrieveGrounding(question);
        send("retrieval", {
          references: retrieval.references,
          elapsedMs: retrieval.elapsedMs,
          subqueryCount: retrieval.subqueryCount,
        });

        const client = getOpenAIClient();
        const model = getDeployment();
        const messages = buildMessages(question, retrieval.grounding);

        // One real generation, streamed live and mirrored to the non-streaming panel at
        // completion, so both panels show the identical answer and only delivery differs.
        const t0 = Date.now();
        let firstTokenMs: number | null = null;
        let tokens = 0;
        let full = "";

        const s = await client.chat.completions.create({
          model,
          messages,
          stream: true,
          stream_options: { include_usage: true },
          ...SHARED_PARAMS,
        });
        for await (const chunk of s) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            if (firstTokenMs === null) {
              firstTokenMs = Date.now() - t0;
              send("stream_first", { ttftMs: firstTokenMs });
            }
            tokens += 1;
            full += delta;
            send("token", { text: delta });
          }
        }

        const totalMs = Date.now() - t0;
        send("stream_complete", { totalMs, ttftMs: firstTokenMs, tokens });
        // Same answer revealed only when complete — mirrors a stream=false response.
        send("nonstream_complete", { text: full, totalMs, tokens });
        send("done", {});
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
