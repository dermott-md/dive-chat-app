import Anthropic from "@anthropic-ai/sdk";

// Models can be overridden via env; these are sensible defaults.
export const CHAT_MODEL = process.env.CHAT_MODEL || "claude-sonnet-4-6";
export const BUILD_MODEL = process.env.BUILD_MODEL || "claude-opus-4-8";

const PLACEHOLDER = "your_anthropic_api_key_here";

/** Returns a configured Anthropic client, or null if no real key is set yet. */
export function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === PLACEHOLDER) return null;
  return new Anthropic({ apiKey: key });
}
