export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export type ChatStatus = 'idle' | 'loading' | 'error';

export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate['id'] === 'string' &&
    (candidate['role'] === 'user' || candidate['role'] === 'assistant') &&
    typeof candidate['content'] === 'string' &&
    typeof candidate['createdAt'] === 'number'
  );
}
