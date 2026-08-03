import { DefaultAzureCredential } from "@azure/identity";

// Managed Identity in Azure; falls back to az login / VS Code sign-in locally.
const credential = new DefaultAzureCredential();
const SEARCH_SCOPE = "https://search.azure.com/.default";

export interface Reference {
  id?: string;
  title?: string;
  content?: string;
}

export interface RetrievalResult {
  grounding: string;
  references: Reference[];
  elapsedMs: number;
  subqueryCount: number;
}

interface Chunk {
  title?: string;
  content?: string;
}

/**
 * Retrieves grounding once by querying the underlying search indexes directly (full-text/BM25).
 * The same result grounds both answers, so streaming is the only variable in the demo.
 * Direct index query is used because the service region does not offer the semantic ranker
 * that Foundry IQ agentic retrieval requires.
 */
export async function retrieveGrounding(question: string): Promise<RetrievalResult> {
  const endpoint = requireEnv("AZURE_SEARCH_ENDPOINT").replace(/\/$/, "");
  const indexes = requireEnv("AZURE_SEARCH_INDEXES")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const apiVersion = process.env.AZURE_SEARCH_API_VERSION ?? "2024-07-01";
  const perIndexTop = Number(process.env.AZURE_SEARCH_TOP ?? "3");

  const token = (await credential.getToken(SEARCH_SCOPE)).token;
  const start = Date.now();

  const perIndex = await Promise.all(
    indexes.map(async (index) => {
      const res = await fetch(
        `${endpoint}/indexes/${index}/docs/search?api-version=${apiVersion}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            search: question,
            top: perIndexTop,
            select: "title,chunk",
            queryType: "simple",
          }),
        },
      );
      if (!res.ok) {
        throw new Error(
          `AI Search query failed on '${index}' (${res.status}): ${await res.text()}`,
        );
      }
      const data = await res.json();
      return (data.value ?? []).map(
        (d: { title?: string; chunk?: string }): Chunk => ({
          title: d.title,
          content: d.chunk,
        }),
      );
    }),
  );

  const elapsedMs = Date.now() - start;
  const chunks: Chunk[] = perIndex.flat();

  const references: Reference[] = chunks.map((c, i) => ({
    id: String(i),
    title: c.title ?? `Source ${i + 1}`,
    content: (c.content ?? "").slice(0, 320),
  }));

  // Grounding is a JSON array of chunks the model can cite.
  const grounding = JSON.stringify(
    chunks.map((c, i) => ({ ref_id: String(i), title: c.title, content: c.content })),
  );

  return { grounding, references, elapsedMs, subqueryCount: indexes.length };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
