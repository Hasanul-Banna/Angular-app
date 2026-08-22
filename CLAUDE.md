# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` / `ng serve --configuration development` — start dev server at `http://localhost:4200/`
- `npm run build` — production build (default config), output to `dist/`
- `npm run build:dev` / `npm run build:prod` — explicit configuration builds
- `npm run watch` — dev build with `--watch`
- `npm test` / `ng test` — run Karma/Jasmine unit tests
  - Single spec: `ng test --include='**/theme.service.spec.ts'`
- `npm run serve:ssr` — run the built SSR server (`node dist/angular-21/server/server.mjs`) after a build
- `ng generate component path/to/name` — scaffold a standalone component (SCSS style by default, per `angular.json` schematics config)

There is no lint script configured in `package.json`.

## UI and product conventions

- Build UI with Angular Material for interactive and accessible components, and Tailwind CSS for layout, spacing, and composition.
- Always follow a mobile-first, fully responsive design approach with a modern, clean, polished UI.
- Always style in a light/dark mode compatible way. Prefer theme-aware tokens and CSS variables so the app works correctly in both themes without hardcoded colors.
- Any user-facing text must be translated in both Bangla (BN) and English (EN). Update the relevant files in `public/i18n` for both languages whenever labels, messages, buttons, validation text, hints, or route content change.
- Take colors from `src/app/theme/color_variables.scss` and the exposed theme tokens instead of introducing ad-hoc colors.

## Architecture

This is an Angular 21 standalone-component app (no NgModules) with SSR enabled via `@angular/ssr`, using NgRx for global state and `@ngx-translate/core` for i18n. Styling is a hybrid of SCSS design tokens, Angular Material (M2 API), and Tailwind CSS v4.

### Path alias

`@core/*` maps to `src/app/core/*` (configured in `tsconfig.json`). Use it for core imports instead of relative paths.

### Directory layout (`src/app`)

- `core/` — app-wide singletons: NgRx store (`core/store`), services (`core/services`), language config (`core/configs`). `guards/`, `interceptors/`, `tokens/`, `constants/` exist as scaffolding for future use.
- `modules/` — feature/route components, one folder per feature (e.g. `modules/auth/login`, `modules/landing/landing-page`), loaded via `loadComponent` in `app.routes.ts`.
- `shared/components/` — reusable standalone components (`theme-switcher`, `lang-switcher`).
- `theme/` — SCSS design tokens (`color_variables.scss`) and Material theme setup (`_theme.scss`).
- `specs/` — architecture/spec docs in Markdown for key cross-cutting features (read these before touching theming or i18n — see below).
- `shared/directives|models|pipes|services|types`, `layouts/`, `pages/`, `ui-kits/`, `utils/` — currently empty, reserved for growth.

### Routing and SSR

- Client routes: `src/app/app.routes.ts`. All feature routes are lazy-loaded via `loadComponent`.
- Server-only route render-mode config: `src/app/app.routes.server.ts` (e.g. prerender vs client rendering per path).
- SSR entry points: `src/main.server.ts`, `src/server.ts` (Express), `src/app/app.config.server.ts`.

### State management (NgRx)

Feature state lives under `core/store/<feature>/` with `actions.ts`, `models.ts`, `reducer.ts`, `selectors.ts`. Everything is re-exported through `core/store/index.ts`. `app-store.providers.ts` wires `provideAppStore()`, which is registered in `app.config.ts`.

Persistence to `localStorage` is done via NgRx **meta-reducers** (`core/store/meta-reducers/`), not inside services — see `app-language-storage.metareducer.ts` for the pattern (read on `INIT`/`UPDATE`, write on every action).

### i18n (`@ngx-translate/core`)

Full flow documented in [src/app/specs/lang-switcher.md](src/app/specs/lang-switcher.md). Key points:

- Supported languages/default are defined in `core/configs/app-languages.config.ts`; language state lives in the NgRx `appLanguage` feature.
- `AppLanguageService` (started via `ENVIRONMENT_INITIALIZER` in `app.config.ts`) is the **only** thing that calls `translateService.use(...)`, driven by an `effect` on the store selector — never call `TranslateService.use()` directly from components.
- Translation JSON lives in `public/i18n/<module>/<lang>.json`. `generic-app` is always loaded (base loader); per-route modules are declared via `static i18nModules = [...]` on the routed component (see `Login` in [src/app/modules/auth/login/login.ts](src/app/modules/auth/login/login.ts)) and lazy-loaded by `RouteTranslateLoaderService` on navigation.
- Any standalone component using the `| translate` pipe must import `TranslatePipe` in its own `imports` array.
- All browser-only APIs in loaders/services are guarded with `isPlatformBrowser` for SSR safety.

### Theming

Full flow documented in [src/app/specs/theming.md](src/app/specs/theming.md) and [src/app/specs/theme-switcher.md](src/app/specs/theme-switcher.md). Key points:

- Color tokens are defined once in `src/app/theme/color_variables.scss` (`$brand-colors`, `$light-theme-colors`, `$dark-theme-colors`) and exposed as CSS variables (`--color-primary`, etc.) plus Tailwind `@theme` tokens in `src/styles.scss`.
- Material theme palettes are configured separately in `src/app/theme/_theme.scss` (M2 API: `m2-define-palette`/`m2-define-light-theme`/`m2-define-dark-theme`) — keep these in sync with the token maps when changing brand colors.
- Runtime mode (`system`/`light`/`dark`) is owned by `ThemeService` (`core/services/theme.service.ts`), which applies `data-theme` attribute + `.dark` class + `color-scheme` to both `html` and `body`. Tailwind `dark:` variants and SCSS `[data-theme='dark']` blocks both key off this.
- Tailwind `preflight` is disabled (`tailwind.config.js`) so Angular Material owns base element resets — don't re-enable it without checking Material styling.
- Responsibility split: Material for complex interactive/accessible components, Tailwind for layout/spacing/composition, CSS variable tokens for cross-system color consistency.
- Keep styling consistent with the design-token system in `src/app/theme` and avoid introducing ad-hoc colors or hardcoded visual values.
