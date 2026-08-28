import { type Action, type ActionReducer, INIT, UPDATE } from '@ngrx/store';

import { isChatModelId } from '@core/services/chat-models';
import { type AppState } from '../app.state';
import { type ChatMessage, isChatMessage } from '../ai-chat/ai-chat.models';
import { aiChatFeatureKey } from '../ai-chat/ai-chat.reducer';

const AI_CHAT_STORAGE_KEY = 'ai-chat-history';
const AI_CHAT_MODEL_STORAGE_KEY = 'ai-chat-model';

export function aiChatStorageMetaReducer(
  reducer: ActionReducer<AppState>
): ActionReducer<AppState> {
  return (state: AppState | undefined, action: Action): AppState => {
    const nextState = reducer(state, action);

    if (action.type === INIT || action.type === UPDATE) {
      const storedMessages = readStoredMessages();
      const storedModelId = readStoredModelId();

      if (storedMessages || storedModelId) {
        return {
          ...nextState,
          [aiChatFeatureKey]: {
            ...nextState[aiChatFeatureKey],
            ...(storedMessages ? { messages: storedMessages } : {}),
            ...(storedModelId ? { selectedModelId: storedModelId } : {}),
          },
        };
      }
    }

    persistMessages(nextState[aiChatFeatureKey]?.messages ?? []);
    persistModelId(nextState[aiChatFeatureKey]?.selectedModelId);

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

/** A model that has since been retired from the registry is treated as nothing stored. */
function readStoredModelId(): string | null {
  if (!supportsBrowserStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(AI_CHAT_MODEL_STORAGE_KEY);

  return isChatModelId(raw) ? raw : null;
}

function persistModelId(modelId: string | undefined): void {
  if (!supportsBrowserStorage() || !modelId) {
    return;
  }

  try {
    window.localStorage.setItem(AI_CHAT_MODEL_STORAGE_KEY, modelId);
  } catch {
    // Persistence is best-effort; ignore storage failures (quota, private mode, etc.).
  }
}

function persistMessages(messages: ChatMessage[]): void {
  if (!supportsBrowserStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Persistence is best-effort; ignore storage failures (quota, private mode, etc.).
  }
}

function supportsBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
