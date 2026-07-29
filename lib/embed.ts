/**
 * Mint a short-lived (24h, read-only) Dive embed session from the MotherDuck API.
 * Requires a Business plan + a service-account token with permission to create
 * embed sessions. The returned session string is passed to the iframe fragment.
 *
 * Docs: https://motherduck.com/docs/key-tasks/dives/embedding-dives/
 */
const EMBED_API = "https://api.motherduck.com/v1/dives";

export interface EmbedSessionOptions {
  version?: number;
  initialState?: Record<string, unknown>;
  requiredResources?: { url: string; alias: string }[];
}

export async function createEmbedSession(
  diveId: string,
  opts: EmbedSessionOptions = {},
): Promise<string> {
  const token = process.env.MOTHERDUCK_TOKEN;
  const username = process.env.MD_SERVICE_ACCOUNT_USERNAME;

  if (!token) throw new Error("MOTHERDUCK_TOKEN is not set");
  if (!username) throw new Error("MD_SERVICE_ACCOUNT_USERNAME is not set");

  const body: Record<string, unknown> = { username };
  if (opts.version != null) body.version = opts.version;
  if (opts.initialState) body.initial_state = opts.initialState;
  if (opts.requiredResources) body.required_resources = opts.requiredResources;

  const res = await fetch(`${EMBED_API}/${diveId}/embed-session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Embed session request failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const data = (await res.json()) as { session?: string };
  if (!data.session) throw new Error("Embed session response did not include a session string");
  return data.session;
}

/** Build the sandbox iframe URL for a given session string. */
export function embedIframeUrl(session: string): string {
  return `https://embed-motherduck.com/sandbox/#session=${session}`;
}
