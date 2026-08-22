# AGENTS.md

This repository is an Angular 21 standalone-component application with SSR, NgRx state, translation support, and a hybrid theming stack.

## Working conventions

- Prefer the existing architecture docs in [CLAUDE.md](CLAUDE.md), [src/app/specs/lang-switcher.md](src/app/specs/lang-switcher.md), [src/app/specs/theming.md](src/app/specs/theming.md), and [src/app/specs/theme-switcher.md](src/app/specs/theme-switcher.md) before introducing new patterns.
- Keep new UI work in standalone components and lazy-load routes with `loadComponent` in [src/app/app.routes.ts](src/app/app.routes.ts).
- Use the path alias `@core/*` for core imports instead of long relative paths.
- For feature work, place code under the relevant area in [src/app/modules](src/app/modules) or [src/app/core](src/app/core) rather than creating ad-hoc folders.

## Build and validation commands

Run commands from the repository root:

- `npm run dev` or `npm start` for the dev server
- `npm run build` for a production build
- `npm run build:dev` or `npm run build:prod` for explicit configs
- `npm test` for unit tests
- `npm run serve:ssr` after a build to verify the SSR server

There is no lint script configured in this project.

## Project-specific rules

- Preserve SSR safety: guard browser-only APIs with `isPlatformBrowser` and avoid direct `window` or `localStorage` access in places that may run on the server.
- Build UI with Angular Material for interactive and accessible components, and Tailwind CSS for layout, spacing, and composition.
- Always follow a mobile-first, fully responsive design approach with a modern, clean, polished UI.
- Always style in a light/dark mode compatible way. Prefer theme-aware tokens and CSS variables so the app works correctly in both themes without hardcoded colors.
- Keep language state in NgRx and let [src/app/core/services/app-language.service.ts](src/app/core/services/app-language.service.ts) drive `TranslateService.use(...)`; do not call translation setup directly from components.
- Keep theme updates centered on [src/app/core/services/theme.service.ts](src/app/core/services/theme.service.ts) so the app applies the `data-theme` attribute, `.dark` class, and color-scheme consistently.
- For persisted state, follow the NgRx meta-reducer pattern in [src/app/core/store/meta-reducers](src/app/core/store/meta-reducers) rather than putting storage logic directly inside services.
- Any user-facing text must be translated in both Bangla (BN) and English (EN). Update the relevant files in [public/i18n](public/i18n) for both languages whenever labels, messages, buttons, validation text, hints, or route content change.
- Take colors from [src/app/theme/color_variables.scss](src/app/theme/color_variables.scss) and the exposed theme tokens instead of introducing ad-hoc colors.
- If UI text changes, update the relevant translation files in [public/i18n](public/i18n) and register route-specific modules through the component’s `i18nModules` configuration when appropriate.

## When making changes

- Prefer small, focused edits that match the current module/service/store structure.
- Keep styling aligned with the design-token system in [src/app/theme](src/app/theme) and the existing Tailwind/Angular Material split.
- If a change affects i18n or theming, review the matching spec documents before editing implementation details.
