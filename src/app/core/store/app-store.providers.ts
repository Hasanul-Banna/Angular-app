import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { type MetaReducer, provideStore } from '@ngrx/store';

import { type AppState, appReducers } from './app.state';
import { appLanguageStorageMetaReducer } from './meta-reducers/app-language-storage.metareducer';
import { aiChatStorageMetaReducer } from './meta-reducers/ai-chat-storage.metareducer';

const appMetaReducers: MetaReducer<AppState>[] = [
  appLanguageStorageMetaReducer,
  aiChatStorageMetaReducer,
];

export function provideAppStore(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideStore(appReducers, {
      metaReducers: appMetaReducers,
    }),
  ]);
}
