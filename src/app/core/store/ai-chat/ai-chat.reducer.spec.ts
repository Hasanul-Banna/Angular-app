import { AiChatActions } from './ai-chat.actions';
import { type ChatMessage } from './ai-chat.models';
import { aiChatReducer, type AiChatState } from './ai-chat.reducer';

describe('aiChatReducer', () => {
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
    const initialState: AiChatState = { messages: [], status: 'idle', error: null };

    const state = aiChatReducer(initialState, AiChatActions.sendMessage({ message: userMessage }));

    expect(state.messages).toEqual([userMessage]);
    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
  });

  it('appends the assistant message and resets status to idle on receiveMessageSuccess', () => {
    const initialState: AiChatState = { messages: [userMessage], status: 'loading', error: null };

    const state = aiChatReducer(
      initialState,
      AiChatActions.receiveMessageSuccess({ message: assistantMessage })
    );

    expect(state.messages).toEqual([userMessage, assistantMessage]);
    expect(state.status).toBe('idle');
  });

  it('sets status to error and stores the error code on receiveMessageFailure, keeping prior messages', () => {
    const initialState: AiChatState = { messages: [userMessage], status: 'loading', error: null };

    const state = aiChatReducer(
      initialState,
      AiChatActions.receiveMessageFailure({ error: 'network' })
    );

    expect(state.messages).toEqual([userMessage]);
    expect(state.status).toBe('error');
    expect(state.error).toBe('network');
  });

  it('resets status to loading and clears the error on retryLastMessage', () => {
    const initialState: AiChatState = { messages: [userMessage], status: 'error', error: 'network' };

    const state = aiChatReducer(initialState, AiChatActions.retryLastMessage());

    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
    expect(state.messages).toEqual([userMessage]);
  });

  it('resets to the initial state on clearConversation', () => {
    const initialState: AiChatState = { messages: [userMessage], status: 'error', error: 'network' };

    const state = aiChatReducer(initialState, AiChatActions.clearConversation());

    expect(state.messages).toEqual([]);
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
  });
});
