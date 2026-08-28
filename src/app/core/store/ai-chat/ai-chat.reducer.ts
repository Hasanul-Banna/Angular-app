import { createReducer, on } from '@ngrx/store';

import { DEFAULT_CHAT_MODEL_ID } from '@core/services/chat-models';
import { AiChatActions } from './ai-chat.actions';
import { type ChatStatus, type ChatMessage } from './ai-chat.models';

export const aiChatFeatureKey = 'aiChat';

export interface AiChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
  selectedModelId: string;
}

const initialState: AiChatState = {
  messages: [],
  status: 'idle',
  error: null,
  selectedModelId: DEFAULT_CHAT_MODEL_ID,
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
  // The model is a standing preference, so it outlives the conversation it was picked in.
  on(AiChatActions.clearConversation, (state): AiChatState => ({
    ...initialState,
    selectedModelId: state.selectedModelId,
  })),
  on(AiChatActions.selectModel, (state, { modelId }): AiChatState => ({
    ...state,
    selectedModelId: modelId,
    status: 'idle',
    error: null,
  }))
);
