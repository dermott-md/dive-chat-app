# Dive Starter Kit

A turnkey, single-page-app-style starter you can hand to a customer. It shows off two
things MotherDuck does well, wired together:

1. **Embed a Dive** — a live, interactive MotherDuck dashboard, full-screen.
2. **Chat with your data** — an LLM (Claude) connected to MotherDuck's **MCP server**,
   so it can run real SQL to answer questions and even **build new reports** for you.

Clone it, add two keys and one dive ID, and deploy to Vercel.

> **⚡ Fastest setup — let Claude do it.** Open [Claude Code](https://claude.com/code) in any
> empty folder and paste this:
>
> ```
> Clone https://github.com/dermott-md/dive-chat-app and set it up for me by
> following its SETUP_WITH_CLAUDE.md. Walk me through anything only I can do,
> and do the rest yourself.
> ```
>
> Claude clones the repo, wires up your MotherDuck data, and gets it running. See
> [SETUP_WITH_CLAUDE.md](./SETUP_WITH_CLAUDE.md) for what it does.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdermott-md%2Fdive-chat-app&env=ANTHROPIC_API_KEY,MOTHERDUCK_TOKEN,MD_SERVICE_ACCOUNT_USERNAME,NEXT_PUBLIC_EXPLORE_DIVE_ID&envDescription=Claude%20key%2C%20MotherDuck%20service-account%20token%20%2B%20username%2C%20and%20the%20Dive%20ID%20to%20show&envLink=https%3A%2F%2Fgithub.com%2Fdermott-md%2Fdive-chat-app%23the-four-values-in-envlocal&project-name=dive-chat-app&repository-name=dive-chat-app)

> The Deploy button clones this repo to your own Vercel account and prompts for the four
> environment variables. You can also just `git clone` it and run locally (see below).

---

## What's inside — 3 pages

| Page | Route | What it does |
|------|-------|--------------|
| **Explore** | `/` | Your chosen Dive, full-screen, with a collapsible chat bubble (bottom-right) for follow-up questions about the data. |
| **Build a report** | `/build` | Describe a report in plain English → Claude builds & embeds a live Dive → keep chatting to tweak it → **Save**. |
| **Saved** | `/saved` | Every report you saved from the Build page. Click to open full-screen or re-open to keep editing. |

Everything runs against **your own MotherDuck account** and **your own Claude key** — nothing
is sent anywhere else.

---

## Prerequisites

- **Node 18+**
- A **MotherDuck Business plan** — required to embed Dives.
- A **MotherDuck service account** with a read/write access token.
  Create one in MotherDuck under **Settings → Service accounts** and give it the **Admin**
  preset role (it includes permission to create Dive embed sessions).
- An **Anthropic (Claude) API key** — <https://console.anthropic.com/>.
- At least one **published Dive**, with its **data shared to the service account** above.

---

## Setup (5 minutes)

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
#    …then open .env.local and fill in the four values (see below).

# 3. Run
npm run dev
# → http://localhost:3000
```

### The four values in `.env.local`

| Variable | What it is |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Your Claude API key. Powers both chat panels and the report builder. |
| `MOTHERDUCK_TOKEN` | Your **service account** access token. Used server-side to mint Dive embed sessions and to run the chat's SQL via MCP. |
| `MD_SERVICE_ACCOUNT_USERNAME` | The **username** of that service account (the embed API requires it). |
| `NEXT_PUBLIC_EXPLORE_DIVE_ID` | The Dive ID shown on the Explore page. Find it in the dive's URL, or via the MCP `list_dives` tool. |

> **Important:** the Dive you point to must have its underlying **data shared with the
> service account**, or the embed will load but show no data.

Optional overrides (see `.env.example`): `CHAT_MODEL`, `BUILD_MODEL`, `NEXT_PUBLIC_APP_NAME`.

---

## Deploy to Vercel

1. Push this folder to a Git repo and import it at <https://vercel.com/new>.
2. Add the same four environment variables in **Project → Settings → Environment Variables**.
3. Deploy. Pushes to your main branch redeploy automatically.

The report builder can take a while for complex dives; the `/api/build` route is configured
with `maxDuration = 300` (needs a Vercel plan that allows longer function timeouts — the Hobby
tier caps at 60s, which is usually fine for chat but may truncate large builds).

---

## How it works (for the curious)

```
Browser
  ├─ Explore (/)          iframe → embed-motherduck.com/sandbox/#session=…
  │   └─ ChatBubble  ──►  POST /api/chat   ─► Claude ⇄ MotherDuck MCP (read-only: query, list_*)
  ├─ Build (/build)       ChatPanel + live preview iframe
  │   └─                  POST /api/build  ─► Claude ⇄ MotherDuck MCP (get_dive_guide, query, save_dive, update_dive…)
  └─ Saved (/saved)       localStorage list → open any dive in an embed iframe

Server (Next.js API routes — your keys stay here)
  └─ POST /api/embed-session ─► MotherDuck API: create a 24h read-only embed session
```

- **Embedding:** the server mints a short-lived embed session (`lib/embed.ts`) and returns only
  the session string. It goes into the iframe URL **fragment** (`#session=…`), so the browser
  never sends it to a server and your service-account token never leaves the backend.
- **Chat & building:** `lib/agent.ts` runs the Claude ⇄ MCP tool-use loop and streams text +
  activity back over Server-Sent Events. The builder uses the MCP `save_dive` / `update_dive`
  tools, then the app embeds the returned dive ID.
- **Saved reports:** stored in the browser's `localStorage` (`lib/store.ts`). The dives themselves
  live in your MotherDuck account; this just records which ones to list. To share saved reports
  across users/devices, swap `lib/store.ts` for a small server route that lists dives from your
  account (e.g. via the MCP `list_dives` tool filtered by a title tag).

---

## Customize

- **Branding:** edit the CSS variables at the top of `app/globals.css` (colors, radius) and set
  `NEXT_PUBLIC_APP_NAME`. The logo mark is in `app/components/NavBar.tsx` / `app/icon.svg`.
- **Chat scope / tone:** edit the system prompts in `app/api/chat/route.ts` and
  `app/api/build/route.ts`.
- **Which MCP tools the chat may use:** the `CHAT_TOOLS` / `BUILD_TOOLS` arrays in those routes.

---

## Project structure

```
app/
  page.tsx                 Explore page
  build/page.tsx           Build page
  saved/page.tsx           Saved page
  layout.tsx, globals.css  shell + styles
  components/              NavBar, DiveFrame, ChatPanel, ChatBubble, Markdown, SetupCard, useChat
  api/
    embed-session/route.ts mint a Dive embed session
    chat/route.ts          Claude + MCP chat (read-only)
    build/route.ts         Claude + MCP report builder
lib/
  embed.ts                 embed-session helper
  mcp-client.ts            MotherDuck MCP client
  anthropic.ts             Claude client + model config
  agent.ts                 Claude ⇄ MCP streaming tool loop
  store.ts                 saved-reports persistence (localStorage)
```
