# Streaming vs Non‑Streaming — RAG Demo

A client‑ready demo that answers **one question two ways at the same time** so you can *see* the
difference between **token streaming** and **non‑streaming**. Both panels use the **same sources**
(your Azure AI Search / Foundry IQ knowledge base) and the **same GPT‑4.1 model** — the only
variable is *how the answer is delivered*.

> New to this? Read [What is streaming?](#what-is-streaming-explained-simply) first.
>
> Beginner setup guide: [NEWBIE_GUIDE.md](NEWBIE_GUIDE.md)

---

## What you get

- **One "Ask" button** fires a single request.
- The app does **retrieval once** (shared grounding), then generates the answer **twice at the
  same time**: `stream = false` and `stream = true`.
- Side‑by‑side panels: the streaming panel fills in **token by token**; the non‑streaming panel
  spins, then dumps the whole answer at once.
- Live metrics: **Time To First Token (TTFT)**, total time, tokens/sec.
- Shared **citations** from Azure AI Search so you can trust the grounding.

## What is streaming? (explained simply)

When a language model writes an answer, it produces small pieces of text called **tokens** (roughly
word‑fragments), one after another.

- **Non‑streaming** = the server waits until *every* token is written, then sends the whole answer
  in one lump. The user sees nothing until it is 100% done.
- **Streaming** = the server sends **each token the moment it is created**. The user starts reading
  almost immediately.

The magic number is **TTFT (Time To First Token)** — how long until the user sees *something*.
Streaming turns a multi‑second stare‑at‑a‑spinner into a few hundred milliseconds.

## Architecture

```
Your question
      │
      ▼
Azure AI Search  ── query the indexes ONCE (full-text) ──►  shared grounding
      │
      ├──►  GPT‑4.1  stream = false   ──►  full answer, all at once   (Non‑streaming panel)
      └──►  GPT‑4.1  stream = true    ──►  tokens as generated        (Streaming panel)
```

- **Retrieval**: queries the underlying search indexes directly with full-text (BM25) search.
  > The existing search service lives in `indonesiacentral`, where the **semantic ranker is not
  > available** — and Foundry IQ agentic retrieval *requires* it. So we query the same indexes
  > directly instead of through the knowledge base. Same data, same service, same Managed Identity.
- **Frontend + backend**: Next.js (App Router). The `/api/ask` route is a Node Server‑Sent‑Events
  (SSE) stream that multiplexes both generations so the browser updates both panels live.
- **Auth**: **Managed Identity only** (`DefaultAzureCredential`) — no API keys anywhere.
- **Hosting**: Azure Container Apps.

| File | Role |
| --- | --- |
| `lib/search.ts` | Queries the search indexes directly (full-text). |
| `lib/openai.ts` | Azure OpenAI client + shared prompt/params. |
| `app/api/ask/route.ts` | Retrieve once → generate twice concurrently → SSE. |
| `components/DemoClient.tsx` | Parses SSE, drives the two panels and metrics. |

---

## Run locally

Prerequisites: Node 20+, `az login`, and your identity granted the roles below.

```powershell
copy .env.local.example .env.local   # then edit AZURE_OPENAI_ENDPOINT + deployment
npm install
npm run dev
```

Open http://localhost:3000 and ask a question.

> Locally, `DefaultAzureCredential` uses your `az login` identity. Make sure **your user** has the
> two roles listed under [Required roles](#required-roles).

## Required roles (Managed Identity)

The app's identity (your user locally, the Container App's system‑assigned identity in Azure) needs:

| Role | Scope | Why |
| --- | --- | --- |
| **Search Index Data Reader** | the AI Search service `searchaiindo` | Query the indexes. |
| **Cognitive Services OpenAI User** | the Azure OpenAI resource | Generate answers with GPT‑4.1. |

> The search service `searchaiindo` was switched from **API‑key‑only** to **`aadOrApiKey`** auth so
> it accepts Managed Identity tokens. This is additive — existing API‑key access still works.

---

## Deploy to Azure Container Apps

Deploys to a **new resource group `rg_stream_demo`** in **southeastasia**. See
[`deploy/deploy.ps1`](deploy/deploy.ps1) for a scripted version, or run the steps below.

```powershell
$RG   = "rg_stream_demo"
$LOC  = "southeastasia"
$APP  = "stream-demo"
$ENVN = "stream-demo-env"

az group create -n $RG -l $LOC

# Build from source and deploy (creates ACR + environment automatically).
az containerapp up `
  --name $APP --resource-group $RG --location $LOC `
  --environment $ENVN --source . `
  --ingress external --target-port 3000

# Turn on the app's managed identity.
az containerapp identity assign --name $APP --resource-group $RG --system-assigned

# Grant the two roles to that identity (see deploy/deploy.ps1 for the full commands).

# Set configuration (no secrets — Managed Identity handles auth).
az containerapp update --name $APP --resource-group $RG --set-env-vars `
  AZURE_SEARCH_ENDPOINT="https://searchaiindo.search.windows.net" `
  AZURE_SEARCH_INDEXES="indexknowledge,rag-motor-3large" `
  AZURE_SEARCH_API_VERSION="2024-07-01" `
  AZURE_SEARCH_TOP="3" `
  AZURE_OPENAI_ENDPOINT="https://openaisoutheat.openai.azure.com" `
  AZURE_OPENAI_DEPLOYMENT="oldfoundrymodelgpt41" `
  AZURE_OPENAI_API_VERSION="2024-10-21"
```

The command prints the public FQDN when it finishes.
