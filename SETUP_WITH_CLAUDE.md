# Set this up with Claude

This app lets you embed a **MotherDuck Dive** full-screen, **chat with your data** (an AI
connected to MotherDuck's MCP server), and **build new reports from plain English**. This guide
is written so **Claude can set it up for you** — you barely have to touch a terminal.

## How to use this

1. Open **[Claude Code](https://claude.com/code)** in any empty folder (run `claude`), and make
   sure the **MotherDuck MCP server** is connected to your MotherDuck account.
2. Paste this to Claude:

   > **"Clone https://github.com/dermott-md/dive-chat-app and set it up for me by following its
   > SETUP_WITH_CLAUDE.md. Walk me through anything only I can do, and do the rest yourself."**

3. Answer Claude's questions when it asks (which dive to show, your API key, etc.). Claude does
   the rest.

> Already have the repo cloned and open? Just say *"Set up this app by following
> SETUP_WITH_CLAUDE.md"* — skip the clone.

### What you'll need
- A **MotherDuck account on the Business plan** (required to embed Dives).
- An **Anthropic (Claude) API key** — get one at <https://console.anthropic.com/>.
- **Node 18+** installed.
- At least one **published Dive** in your MotherDuck account.

---

# Instructions for Claude

You are setting up the **Dive Starter Kit** for the user on their own MotherDuck account. Read
`README.md` first for the architecture. Then work through the phases below. **Do the automatable
work yourself; pause only for the two things that genuinely require the human** (creating a
service-account token in the UI, and providing their Anthropic key).

### Hard rules
- **Never** print, echo, log, or commit the service-account token or the Anthropic key. They go
  **only** into `.env.local`, which is gitignored. Confirm `.env.local` is in `.gitignore`.
- **Never `DROP` or recreate an existing share.** If you need a new share, use a new name. (Doing
  otherwise permanently breaks any dive that resolves that share.)
- If you have the MotherDuck MCP tools available, use them to automate discovery and sharing. If
  not, give the user the exact SQL to run in the MotherDuck web UI and continue from their result.
- Verify each phase before moving on. If something fails, diagnose and fix before continuing.

### Phase 1 — Get the code & install
If this repo isn't already cloned locally, clone it and `cd` into it:
`git clone https://github.com/dermott-md/dive-chat-app && cd dive-chat-app`
Then run `npm install`. (Node 18+ is required; if `npm` isn't found, the user may manage Node via
`fnm`/`nvm` — help them activate it.)

### Phase 2 — Pick the dive for the Explore page
- If you have the MCP `list_dives` tool: list the user's dives and ask which one to feature on the
  home page. Capture its **dive id** (a UUID).
- Otherwise ask the user for the dive id (it's in the dive's URL).

### Phase 3 — Work out what data that dive needs
The embed runs as a **read-only service account**, which does **not** automatically see the user's
databases — so any database the dive queries must be **shared to that service account**, and must
resolve under the **exact name the dive uses**.

- If you have MCP `read_dive`: read the chosen dive's content and find:
  - a `REQUIRED_DATABASES = [...]` array (may list `md:_share/...` share URLs with aliases), and/or
  - **fully-qualified table references** in the SQL, e.g. `"my_db"."main"."my_table"` → the
    database name is `my_db`.
  - (The dive content can be large. Save it to a file and grep for `REQUIRED_DATABASES`, `FROM`,
    `JOIN`, and quoted `"db"."schema"."table"` patterns rather than reading the whole thing.)
- Otherwise, ask the user which database(s) the dive reads from.

Produce a list of **source database names** the dive depends on (e.g. `["sales_db"]`).

### Phase 4 — Service account (the human does this part in the UI)
Ask the user to:
1. Go to **MotherDuck → Settings → Service Accounts → Create service account**.
2. Choose a username (letters/numbers/underscores), e.g. `embed_sa`, and give it the **Admin**
   preset role (it includes the "create Dive embed session" permission). Save.
3. Select it → **+ Create token** → **Read/Write** → **copy the token** (shown only once).
4. Paste that token into `.env.local` on the `MOTHERDUCK_TOKEN=` line themselves (so you never see
   it), and tell you the **username** they chose.

Set `MD_SERVICE_ACCOUNT_USERNAME` in `.env.local` to that username.

> You *may* offer to create the service account via SQL if your MCP tools support it, but token
> creation typically must happen in the UI (the token is only displayed once), so the UI path is
> the reliable default.

### Phase 5 — Share each source database to the service account
For **each** source database `X` from Phase 3, do the following (via MCP `query_rw` if available,
otherwise hand the user the SQL to run):

```sql
CREATE SHARE X_embed FROM X (ACCESS RESTRICTED, UPDATE AUTOMATIC);   -- returns a share_url
GRANT READ ON SHARE X_embed TO USER <service_account_username>;
```

- Use a share name that doesn't already exist (append `_embed`, or `_embed2`, etc.).
- Note the returned `share_url` (looks like `md:_share/X_embed/<uuid>`).

Then set **`EMBED_REQUIRED_RESOURCES`** in `.env.local` to a JSON array that maps each share to the
**exact database name the dive expects** (this guarantees the name resolves for the service
account regardless of how the dive was written):

```
EMBED_REQUIRED_RESOURCES=[{"url":"md:_share/X_embed/<uuid>","alias":"X"}]
```

(One object per source database. This is the single most common reason an embed loads but shows no
data — get the alias exactly right.)

### Phase 6 — Fill in the rest of `.env.local`
Copy `.env.example` to `.env.local` if it doesn't exist, then ensure it contains:
- `ANTHROPIC_API_KEY=` — ask the user to paste their key (don't read it back).
- `MOTHERDUCK_TOKEN=` — the service-account token (from Phase 4; user pastes it).
- `MD_SERVICE_ACCOUNT_USERNAME=` — the service-account username.
- `NEXT_PUBLIC_EXPLORE_DIVE_ID=` — the dive id from Phase 2.
- `EMBED_REQUIRED_RESOURCES=` — from Phase 5 (omit if the dive needs no shared databases).
- `NEXT_PUBLIC_APP_NAME=` — optional; set to the customer's product name for branding.

### Phase 7 — Run and verify
- Start it: `npm run dev` (note the port — it uses 3001+ if 3000 is busy).
- Open the printed URL. Verify:
  - **Explore** — the dive loads embedded (not an error). If you see "Couldn't load the dive",
    re-check `MOTHERDUCK_TOKEN`, the service account's Admin role, and that the share is granted +
    the `EMBED_REQUIRED_RESOURCES` alias matches the dive's database name exactly.
  - **Chat bubble (bottom-right)** — ask a question; it should run SQL and answer.
  - **Build a report** — describe a simple report; it should generate and preview a live dive.
- Report what works and what doesn't to the user.

### Phase 8 — Deploy to Vercel (optional, when they're happy)
1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Import it at <https://vercel.com/new> and add the **same** env vars from `.env.local` under
   Project → Settings → Environment Variables.
3. In `README.md`, replace `YOUR_ORG` in the "Deploy with Vercel" button URL with the repo path so
   the button works for future clones.
4. Note: large report builds can exceed Vercel's Hobby 60s function limit; the `/api/build` route
   sets `maxDuration = 300`, which needs a plan that allows longer timeouts.

### When you're done
Give the user a short summary: the local URL, which dive is embedded, which databases you shared,
and anything still needed (e.g. "add your Anthropic key to test chat"). Remind them their token
and key live only in `.env.local` and must be re-entered in Vercel for deployment.
