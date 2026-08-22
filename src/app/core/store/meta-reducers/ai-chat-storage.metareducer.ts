import { type Action, type ActionReducer, INIT, UPDATE } from '@ngrx/store';

import { type AppState } from '../app.state';
import { type ChatMessage, isChatMessage } from '../ai-chat/ai-chat.models';
import { aiChatFeatureKey } from '../ai-chat/ai-chat.reducer';

const AI_CHAT_STORAGE_KEY = 'ai-chat-history';

export function aiChatStorageMetaReducer(
  reducer: ActionReducer<AppState>
): ActionReducer<AppState> {
  return (state: AppState | undefined, action: Action): AppState => {
    const nextState = reducer(state, action);

    if (action.type === INIT || action.type === UPDATE) {
      const storedMessages = readStoredMessages();

      if (storedMessages) {
        return {
          ...nextState,
          [aiChatFeatureKey]: {
            ...nextState[aiChatFeatureKey],
            messages: storedMessages,
          },
        };
      }
    }

    persistMessages(nextState[aiChatFeatureKey]?.messages ?? []);

    return nextState;
  };
}

function readStoredMessages(): ChatMessage[] | null {
  if (!supportsBrowserStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(AI_CHAT_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.every(isChatMessage)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function persistMessages(messages: ChatMessage[]): void {
  if (!supportsBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(messages));
}

function supportsBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
