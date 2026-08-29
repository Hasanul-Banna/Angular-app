import { createReducer, on } from '@ngrx/store';

import { AiChatActions } from './ai-chat.actions';
import { type ChatStatus, type ChatMessage } from './ai-chat.models';

export const aiChatFeatureKey = 'aiChat';

export interface AiChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
}

const initialState: AiChatState = {
  messages: [],
  status: 'idle',
  error: null,
};

export const aiChatReducer = createReducer(
  initialState,
  on(AiChatActions.sendMessage, (state, { message }): AiChatState => ({
    ...state,
    messages: [...state.messages, message],
    status: 'loading',
    error: null,
  })),
  on(AiChatActions.retryLastMessage, (state): AiChatState => ({
    ...state,
    status: 'loading',
    error: null,
  })),
  on(AiChatActions.receiveMessageSuccess, (state, { message }): AiChatState => ({
    ...state,
    messages: [...state.messages, message],
    status: 'idle',
    error: null,
  })),
  on(AiChatActions.receiveMessageFailure, (state, { error }): AiChatState => ({
    ...state,
    status: 'error',
    error,
  })),
  on(AiChatActions.clearConversation, (): AiChatState => initialState)
);
