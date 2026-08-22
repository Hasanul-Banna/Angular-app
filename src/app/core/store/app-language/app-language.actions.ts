import { createActionGroup, props } from '@ngrx/store';

import { type AppLanguage } from './app-language.models';

export const AppLanguageActions = createActionGroup({
  source: 'App Language',
  events: {
    'Set App Language': props<{ language: AppLanguage }>(),
  },
});
