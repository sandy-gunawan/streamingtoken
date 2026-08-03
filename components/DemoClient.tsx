"use client";

import { useCallback, useRef, useState } from "react";
import AnswerPanel, { type Metric } from "./AnswerPanel";

interface Reference {
  id?: string;
  title?: string;
  content?: string;
}

interface RetrievalInfo {
  references: Reference[];
  elapsedMs: number;
  subqueryCount: number;
}

const SUGGESTIONS = [
  "What does the motor warranty cover?",
  "How do I submit an invoice for reimbursement?",
  "Summarize the key maintenance requirements.",
];

export default function DemoClient() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrieval, setRetrieval] = useState<RetrievalInfo | null>(null);

  const [streamText, setStreamText] = useState("");
  const [streamDone, setStreamDone] = useState(false);
  const [ttftMs, setTtftMs] = useState<number | null>(null);
  const [streamTotalMs, setStreamTotalMs] = useState<number | null>(null);
  const [streamTokens, setStreamTokens] = useState<number>(0);

  const [nonStreamText, setNonStreamText] = useState("");
  const [nonStreamDone, setNonStreamDone] = useState(false);
  const [nonStreamMs, setNonStreamMs] = useState<number | null>(null);
  const [nonStreamTokens, setNonStreamTokens] = useState<number | null>(null);

  const [phase, setPhase] = useState<"idle" | "retrieving" | "generating" | "done">("idle");
  const abortRef = useRef<AbortController | null>(null);

  const reset = () => {
    setError(null);
    setRetrieval(null);
    setStreamText("");
    setStreamDone(false);
    setTtftMs(null);
    setStreamTotalMs(null);
    setStreamTokens(0);
    setNonStreamText("");
    setNonStreamDone(false);
    setNonStreamMs(null);
    setNonStreamTokens(null);
  };

  const handleEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case "retrieval":
        setRetrieval(data);
        setPhase("generating");
        break;
      case "stream_first":
        setTtftMs(data.ttftMs);
        break;
      case "token":
        setStreamText((prev) => prev + data.text);
        setStreamTokens((n) => n + 1);
        break;
      case "stream_complete":
        setStreamTotalMs(data.totalMs);
        setTtftMs((prev) => prev ?? data.ttftMs);
        setStreamTokens(data.tokens ?? 0);
        setStreamDone(true);
        break;
      case "nonstream_complete":
        setNonStreamText(data.text);
        setNonStreamMs(data.totalMs);
        setNonStreamTokens(data.tokens);
        setNonStreamDone(true);
        break;
      case "error":
        setError(data.message ?? "Something went wrong.");
        break;
      case "done":
        setPhase("done");
        break;
    }
  }, []);

  const ask = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || busy) return;
      reset();
      setBusy(true);
      setPhase("retrieving");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) >= 0) {
            const rawEvent = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);

            let name = "message";
            let dataLine = "";
            for (const line of rawEvent.split("\n")) {
              if (line.startsWith("event:")) name = line.slice(6).trim();
              else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
            }
            if (dataLine) handleEvent(name, JSON.parse(dataLine));
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        setBusy(false);
        setPhase((p) => (p === "done" ? "done" : "done"));
      }
    },
    [busy, handleEvent],
  );

  const streaming = phase === "generating" && !streamDone;
  const tokensPerSec = (tokens: number | null, ms: number | null) =>
    tokens && ms ? Math.round((tokens / ms) * 1000) : null;

  const streamMetrics: Metric[] = [
    { k: "Time to 1st token", v: ttftMs != null ? `${ttftMs} ms` : "—", hero: true },
    { k: "Total time", v: streamTotalMs != null ? `${streamTotalMs} ms` : "—" },
    {
      k: "Tokens / sec",
      v: streamDone ? String(tokensPerSec(streamTokens, streamTotalMs) ?? "—") : "…",
    },
  ];

  const nonStreamMetrics: Metric[] = [
    { k: "Time to answer", v: nonStreamMs != null ? `${nonStreamMs} ms` : "—", hero: true },
    { k: "Tokens", v: nonStreamTokens != null ? String(nonStreamTokens) : "—" },
    {
      k: "Tokens / sec",
      v: nonStreamDone ? String(tokensPerSec(nonStreamTokens, nonStreamMs) ?? "—") : "…",
    },
  ];

  return (
    <>
      <div className="ask">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(question)}
          placeholder="Ask a question about your knowledge base…"
          disabled={busy}
        />
        <button className="btn" onClick={() => ask(question)} disabled={busy || !question.trim()}>
          {busy ? "Running…" : "Ask both ↦"}
        </button>
      </div>

      <div className="panels">
        <AnswerPanel
          variant="stream"
          name="Streaming"
          tag="stream = true"
          text={streamText}
          loading={phase === "generating" && !streamText}
          streaming={streaming}
          placeholder={
            phase === "idle"
              ? "Tokens will appear here the instant they are generated."
              : "Waiting for first token…"
          }
          metrics={streamMetrics}
        />
        <AnswerPanel
          variant="nonstream"
          name="Non-streaming"
          tag="stream = false"
          text={nonStreamText}
          loading={phase === "generating" && !nonStreamDone}
          streaming={false}
          placeholder={
            phase === "idle"
              ? "The full answer will appear all at once, after a wait."
              : "Generating the full answer…"
          }
          metrics={nonStreamMetrics}
        />
      </div>

      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="chip"
            disabled={busy}
            onClick={() => {
              setQuestion(s);
              ask(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {(retrieval || phase === "retrieving") && (
        <div className="retrieval">
          <div className="retrieval-head">
            <span className="label">Retrieval · Azure AI Search</span>
            {phase === "retrieving" && !retrieval ? (
              <span className="pill">searching…</span>
            ) : (
              retrieval && (
                <>
                  <span className="pill">{retrieval.elapsedMs} ms</span>
                  <span className="pill">{retrieval.subqueryCount} indexes</span>
                  <span className="pill">{retrieval.references.length} sources</span>
                  <span style={{ marginLeft: "auto", color: "var(--green)" }}>
                    shared by both panels
                  </span>
                </>
              )
            )}
          </div>
          {retrieval && retrieval.references.length > 0 && (
            <div className="cites">
              {retrieval.references.map((r, i) => (
                <div className="cite" key={r.id ?? i}>
                  <div className="t">{r.title ?? `Source ${i + 1}`}</div>
                  <div className="c">{r.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
