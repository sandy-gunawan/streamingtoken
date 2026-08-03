import { AzureOpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";

const credential = new DefaultAzureCredential();
const azureADTokenProvider = getBearerTokenProvider(
  credential,
  "https://cognitiveservices.azure.com/.default",
);

export function getOpenAIClient(): AzureOpenAI {
  return new AzureOpenAI({
    endpoint: requireEnv("AZURE_OPENAI_ENDPOINT"),
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
    azureADTokenProvider,
  });
}

export function getDeployment(): string {
  return requireEnv("AZURE_OPENAI_DEPLOYMENT");
}

// Identical prompt for both panels so streaming is the only difference.
export function buildMessages(
  question: string,
  grounding: string,
): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content:
        "You are a helpful assistant. Answer the user's question using ONLY the sources " +
        "provided below. Be concise and factual. If the answer is not in the sources, say " +
        "you don't have enough information.\n\nSources (JSON):\n" +
        grounding,
    },
    { role: "user", content: question },
  ];
}

export const SHARED_PARAMS = {
  temperature: 0.2,
  max_tokens: 600,
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
