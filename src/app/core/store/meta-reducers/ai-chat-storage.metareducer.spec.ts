import { INIT } from '@ngrx/store';

import { DEFAULT_CHAT_MODEL_ID } from '@core/services/chat-models';
import { type AppState } from '../app.state';
import { aiChatStorageMetaReducer } from './ai-chat-storage.metareducer';

const MODEL_STORAGE_KEY = 'ai-chat-model';

describe('aiChatStorageMetaReducer', () => {
  function stateWith(selectedModelId: string): AppState {
    return {
      appLanguage: { current: 'en' },
      aiChat: { messages: [], status: 'idle', error: null, selectedModelId },
    };
  }

  /** Wraps a reducer that always returns `state`, so only the meta-reducer's work is observed. */
  function run(state: AppState, actionType: string): AppState {
    return aiChatStorageMetaReducer(() => state)(state, { type: actionType });
  }

  beforeEach(() => {
    window.localStorage.removeItem(MODEL_STORAGE_KEY);
  });

  afterAll(() => {
    window.localStorage.removeItem(MODEL_STORAGE_KEY);
  });

  it('restores a stored model selection on init', () => {
    window.localStorage.setItem(MODEL_STORAGE_KEY, 'gpt-5-mini');

    const state = run(stateWith(DEFAULT_CHAT_MODEL_ID), INIT);

    expect(state.aiChat.selectedModelId).toBe('gpt-5-mini');
  });

  it('ignores a stored model id that is no longer offered', () => {
    window.localStorage.setItem(MODEL_STORAGE_KEY, 'retired-model');

    const state = run(stateWith(DEFAULT_CHAT_MODEL_ID), INIT);

    expect(state.aiChat.selectedModelId).toBe(DEFAULT_CHAT_MODEL_ID);
  });

  it('persists the selected model on every action', () => {
    run(stateWith('gpt-5.1'), '[AI Chat] Select Model');

    expect(window.localStorage.getItem(MODEL_STORAGE_KEY)).toBe('gpt-5.1');
  });
});
