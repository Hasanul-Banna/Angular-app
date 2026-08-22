import { type Action, type ActionReducer, INIT, UPDATE } from '@ngrx/store';

import { type AppState } from '../app.state';
import {
  type AppLanguage,
  DEFAULT_APP_LANGUAGE,
  isAppLanguage,
} from '../app-language/app-language.models';
import { appLanguageFeatureKey } from '../app-language/app-language.reducer';

const APP_LANGUAGE_STORAGE_KEY = 'app-language';

export function appLanguageStorageMetaReducer(
  reducer: ActionReducer<AppState>
): ActionReducer<AppState> {
  return (state: AppState | undefined, action: Action): AppState => {
    const nextState = reducer(state, action);

    if (action.type === INIT || action.type === UPDATE) {
      const savedLanguage = readStoredLanguage();

      if (savedLanguage) {
        return {
          ...nextState,
          [appLanguageFeatureKey]: {
            ...nextState[appLanguageFeatureKey],
            current: savedLanguage,
          },
        };
      }
    }

    persistLanguage(nextState[appLanguageFeatureKey]?.current ?? DEFAULT_APP_LANGUAGE);

    return nextState;
  };
}

function readStoredLanguage(): AppLanguage | null {
  if (!supportsBrowserStorage()) {
    return null;
  }

  const candidate = window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);

  if (candidate && isAppLanguage(candidate)) {
    return candidate;
  }

  return null;
}

function persistLanguage(language: AppLanguage): void {
  if (!supportsBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
}

function supportsBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

