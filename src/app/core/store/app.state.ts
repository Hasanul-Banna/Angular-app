import { type ActionReducerMap } from '@ngrx/store';

import {
  type AppLanguageState,
  appLanguageFeatureKey,
  appLanguageReducer,
} from './app-language/app-language.reducer';

export interface AppState {
  [appLanguageFeatureKey]: AppLanguageState;
}

export const appReducers: ActionReducerMap<AppState> = {
  [appLanguageFeatureKey]: appLanguageReducer,
};
