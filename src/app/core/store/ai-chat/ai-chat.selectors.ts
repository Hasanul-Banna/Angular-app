import { createFeatureSelector, createSelector } from '@ngrx/store';

import { type AppState } from '../app.state';
import { type AiChatState, aiChatFeatureKey } from './ai-chat.reducer';

export const selectAiChatState = createFeatureSelector<AppState, AiChatState>(
  aiChatFeatureKey
);

export const selectAiChatMessages = createSelector(
  selectAiChatState,
  (state) => state.messages
);

export const selectAiChatStatus = createSelector(
  selectAiChatState,
  (state) => state.status
);

export const selectAiChatError = createSelector(
  selectAiChatState,
  (state) => state.error
);

export const selectAiChatSelectedModelId = createSelector(
  selectAiChatState,
  (state) => state.selectedModelId
);
