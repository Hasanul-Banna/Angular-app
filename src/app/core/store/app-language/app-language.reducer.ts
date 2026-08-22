import { createReducer, on } from '@ngrx/store';

import { AppLanguageActions } from './app-language.actions';
import { type AppLanguage, DEFAULT_APP_LANGUAGE } from './app-language.models';

export const appLanguageFeatureKey = 'appLanguage';

export interface AppLanguageState {
  current: AppLanguage;
}

const initialState: AppLanguageState = {
  current: DEFAULT_APP_LANGUAGE,
};

export const appLanguageReducer = createReducer(
  initialState,
  on(AppLanguageActions.setAppLanguage, (state, { language }): AppLanguageState => ({
    ...state,
    current: language,
  }))
);
