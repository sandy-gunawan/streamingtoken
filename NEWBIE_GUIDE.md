# Newbie Guide: Streaming Token Demo

This guide is for first-time users. It explains what this project does, why it matters, and how to run it safely.

## 1. What this project is

This is a Next.js web app that shows one AI answer in two delivery styles at the same time:

- Non-streaming: you wait, then the full answer appears at once.
- Streaming: tokens appear immediately, piece by piece.

Both panels use the same retrieval data from Azure AI Search and the same model in Azure OpenAI. The only difference is delivery style.

## 2. Why this demo exists

Many people ask: "Is streaming really faster?"

This app helps you show the difference clearly:

- User-perceived speed (how fast users see text)
- Time To First Token (TTFT)
- Total completion time

If TTFT is low, users feel the app is responsive even when full generation still takes time.

## 3. Core idea in plain language

Think of an AI answer like a package made of many small parts.

- Non-streaming: the courier waits until every part is packed, then delivers one big box.
- Streaming: the courier sends each part as soon as it is ready.

So streaming feels faster because users can start reading early.

## 4. Project flow (simple)

1. You type one question.
2. Server retrieves grounding data from Azure AI Search.
3. Server asks Azure OpenAI to generate answer.
4. Server sends output to two UI panels:
   - streaming panel receives live token chunks
   - non-streaming panel receives final text when complete

## 5. Prerequisites

Install these first:

- Node.js 20+
- npm
- Azure CLI (`az`)
- An Azure account that can access:
  - Azure AI Search service
  - Azure OpenAI resource

Then sign in:

```powershell
az login
```

## 6. Environment setup

From the project root, copy the sample env file:

```powershell
copy .env.local.example .env.local
```

Open `.env.local` and verify values:

- `AZURE_SEARCH_ENDPOINT`
- `AZURE_SEARCH_INDEXES`
- `AZURE_SEARCH_API_VERSION`
- `AZURE_SEARCH_TOP`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION`

## 7. Install and run locally

```powershell
npm install
npm run dev
```

Open:

- http://localhost:3000

## 8. Required Azure roles

Your identity must have:

- `Search Index Data Reader` on the AI Search service
- `Cognitive Services OpenAI User` on the Azure OpenAI resource

Without these roles, the app cannot retrieve data or generate answers.

## 9. Where key code lives

- `app/api/ask/route.ts`: backend endpoint, retrieval + generation streaming events
- `lib/search.ts`: query Azure AI Search indexes
- `lib/openai.ts`: Azure OpenAI client setup and prompt config
- `components/DemoClient.tsx`: frontend SSE handling and panel updates

## 10. Quick troubleshooting

- Blank answer or error:
  - Check `az login` session.
  - Recheck role assignments.
  - Confirm endpoints/deployment names in `.env.local`.

- App not opening:
  - Ensure port 3000 is free.
  - Restart with `npm run dev`.

- Build issues:
  - Delete `node_modules`, reinstall with `npm install`.

## 11. Deploy to Azure Container Apps

Use the script:

```powershell
./deploy/deploy.ps1
```

What this script creates and uses:

- Creates resource group: `rg_stream_demo` in `southeastasia`
- Deploys app to Azure Container Apps
- Enables system-assigned managed identity
- Assigns required roles for Search and OpenAI
- Sets app environment variables

After deployment, it prints the public URL.

## 12. What to show in a client demo

Use this script for your talk track:

1. Ask one question.
2. Point at streaming panel: tokens appear quickly.
3. Point at non-streaming panel: waits, then full text appears.
4. Compare TTFT and total time.
5. Explain both use same model and same data grounding.

That keeps the comparison fair and easy to understand.
