import { DEFAULT_CHAT_MODEL_ID } from '@core/services/chat-models';
import { AiChatActions } from './ai-chat.actions';
import { type ChatMessage } from './ai-chat.models';
import { aiChatReducer, type AiChatState } from './ai-chat.reducer';

describe('aiChatReducer', () => {
  function stateWith(overrides: Partial<AiChatState> = {}): AiChatState {
    return {
      messages: [],
      status: 'idle',
      error: null,
      selectedModelId: DEFAULT_CHAT_MODEL_ID,
      ...overrides,
    };
  }

  const userMessage: ChatMessage = {
    id: 'user-1',
    role: 'user',
    content: 'Hello',
    createdAt: 1000,
  };

  const assistantMessage: ChatMessage = {
    id: 'assistant-1',
    role: 'assistant',
    content: 'Hi there',
    createdAt: 2000,
  };

  it('appends the user message and sets status to loading on sendMessage', () => {
    const initialState = stateWith();

    const state = aiChatReducer(initialState, AiChatActions.sendMessage({ message: userMessage }));

    expect(state.messages).toEqual([userMessage]);
    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
  });

  it('appends the assistant message and resets status to idle on receiveMessageSuccess', () => {
    const initialState = stateWith({ messages: [userMessage], status: 'loading' });

    const state = aiChatReducer(initialState, AiChatActions.receiveMessageSuccess({ message: assistantMessage }));

    expect(state.messages).toEqual([userMessage, assistantMessage]);
    expect(state.status).toBe('idle');
  });

  it('sets status to error and stores the error code on receiveMessageFailure, keeping prior messages', () => {
    const initialState = stateWith({ messages: [userMessage], status: 'loading' });

    const state = aiChatReducer(initialState, AiChatActions.receiveMessageFailure({ error: 'network' }));

    expect(state.messages).toEqual([userMessage]);
    expect(state.status).toBe('error');
    expect(state.error).toBe('network');
  });

  it('resets status to loading and clears the error on retryLastMessage', () => {
    const initialState = stateWith({ messages: [userMessage], status: 'error', error: 'network' });

    const state = aiChatReducer(initialState, AiChatActions.retryLastMessage());

    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
    expect(state.messages).toEqual([userMessage]);
  });

  it('resets to the initial state on clearConversation', () => {
    const initialState = stateWith({ messages: [userMessage], status: 'error', error: 'network' });

    const state = aiChatReducer(initialState, AiChatActions.clearConversation());

    expect(state.messages).toEqual([]);
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
  });

  it('starts on the default chat model', () => {
    const state = aiChatReducer(undefined, { type: '@@init' });

    expect(state.selectedModelId).toBe(DEFAULT_CHAT_MODEL_ID);
  });

  it('stores the chosen model on selectModel', () => {
    const state = aiChatReducer(stateWith(), AiChatActions.selectModel({ modelId: 'gpt-5-mini' }));

    expect(state.selectedModelId).toBe('gpt-5-mini');
  });

  it('clears the in-flight error when switching model', () => {
    const initialState = stateWith({ messages: [userMessage], status: 'error', error: 'quota' });

    const state = aiChatReducer(initialState, AiChatActions.selectModel({ modelId: 'gpt-5.1' }));

    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.messages).toEqual([userMessage]);
  });

  it('keeps the selected model when the conversation is cleared', () => {
    const initialState = stateWith({ messages: [userMessage], selectedModelId: 'gpt-5-mini' });

    const state = aiChatReducer(initialState, AiChatActions.clearConversation());

    expect(state.selectedModelId).toBe('gpt-5-mini');
  });
});
