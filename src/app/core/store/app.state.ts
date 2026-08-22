import { type ActionReducerMap } from '@ngrx/store';

import {
  type AppLanguageState,
  appLanguageFeatureKey,
  appLanguageReducer,
} from './app-language/app-language.reducer';
import {
  type AiChatState,
  aiChatFeatureKey,
  aiChatReducer,
} from './ai-chat/ai-chat.reducer';

export interface AppState {
  [appLanguageFeatureKey]: AppLanguageState;
  [aiChatFeatureKey]: AiChatState;
}

export const appReducers: ActionReducerMap<AppState> = {
  [appLanguageFeatureKey]: appLanguageReducer,
  [aiChatFeatureKey]: aiChatReducer,
};
