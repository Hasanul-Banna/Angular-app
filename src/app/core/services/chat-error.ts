/** Error codes the chat widget can translate — one `aiChat.errors.<code>` key each. */
export type ChatErrorCode = 'missingKey' | 'network' | 'quota' | 'unknown';

export class ChatError extends Error {
  constructor(
    readonly code: ChatErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

/**
 * Classifies a raw provider/network failure. Neither provider exposes a documented error-code
 * contract to the browser, so message text is the only signal available.
 */
export function toChatError(err: unknown): ChatError {
  if (err instanceof ChatError) {
    return err;
  }

  const message = err instanceof Error ? err.message : String(err);

  if (/quota|rate.?limit|429/i.test(message)) {
    return new ChatError('quota', message);
  }

  if (/network|fetch|failed to connect/i.test(message)) {
    return new ChatError('network', message);
  }

  return new ChatError('unknown', message);
}
