/**
 * Brain adapter selection for this app.
 * Default: MockBrainAdapter (deterministic, no API key).
 * Switch to ChatGPT (or other) when OPENAI_API_KEY is set — see framework docs.
 */
export const brainConfig = {
  /** Profile id stamped on Conversation bootstrap metadata. */
  profileId: process.env.POC_BRAIN_PROFILE?.trim() || 'default',
} as const;
