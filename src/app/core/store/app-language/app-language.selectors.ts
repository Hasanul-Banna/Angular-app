import { createFeatureSelector, createSelector } from '@ngrx/store';

import { type AppState } from '../app.state';
import { type AppLanguageState, appLanguageFeatureKey } from './app-language.reducer';

export const selectAppLanguageState = createFeatureSelector<
  AppState,
  AppLanguageState
>(appLanguageFeatureKey);

export const selectAppLanguage = createSelector(
  selectAppLanguageState,
  (state) => state.current
);
