# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` / `ng serve --configuration development` — start dev server at `http://localhost:4200/`
- `npm run dev:local` / `ng serve --configuration local` — dev server using `src/environments/env.local.ts` (gitignored, for a real local API key)
- `npm run build` — production build (default config), output to `dist/`
- `npm run build:dev` / `npm run build:prod` / `npm run build:local` — explicit configuration builds
- `npm run watch` — dev build with `--watch`
- `npm run lint` / `ng lint` — ESLint (flat config, `eslint.config.js`); lint a subset with `ng lint --lint-file-patterns 'src/app/pages/**/*.ts'`
- `npm run format` / `npm run format:check` — Prettier over `src/**/*.{ts,html,scss}`
- `npm test` / `ng test` — Karma/Jasmine unit tests via the `@angular/build:karma` builder
  - Single spec: `ng test --include='**/theme.service.spec.ts'`
  - **There are currently no `*.spec.ts` files in the repo** — `ng test` runs an empty suite. New tests are the first ones.
- `npm run serve:ssr` — run the built SSR server (`node dist/angular-21/server/server.mjs`) after a build
- `ng generate component path/to/name` — scaffold a standalone component (SCSS style by default, `app` selector prefix, per `angular.json`)

### Lint rules that shape the code style

Enforced as errors, so write new code this way from the start:

- Type-only imports must be inline: `import { type Routes } from '@angular/router'` (`consistent-type-imports` with `fixStyle: inline-type-imports`).
- `no-console` except `warn`/`error`; `eqeqeq`, `prefer-const`, `no-var`.
- `no-floating-promises` / `no-misused-promises` (type-checked rules — `projectService: true`).
- Selectors: components `app-kebab-case` elements, directives `appCamelCase` attributes.
- Templates: `@if`/`@for` control flow required (`prefer-control-flow`), `button-has-type`, template `eqeqeq`, plus the Angular a11y template rule set.
- Warnings worth honoring: `prefer-signals`, `prefer-on-push-component-change-detection`, `use-track-by-function`, `prefer-self-closing-tags`.

## UI and product conventions

- Build UI with Angular Material for interactive and accessible components, and Tailwind CSS for layout, spacing, and composition.
- Always follow a mobile-first, fully responsive design approach with a modern, clean, polished UI.
- Always style in a light/dark mode compatible way. Prefer theme-aware tokens and CSS variables so the app works correctly in both themes without hardcoded colors.
- Any user-facing text must be translated in both Bangla (BN) and English (EN). Update the relevant files in `public/i18n` for both languages whenever labels, messages, buttons, validation text, hints, or route content change.
- Take colors from `src/app/theme/color_variables.scss` and the exposed theme tokens instead of introducing ad-hoc colors.

## Architecture

This is an Angular LT standalone-component app (no NgModules) with SSR enabled via `@angular/ssr`, using NgRx for global state and `@ngx-translate/core` for i18n. Styling is a hybrid of SCSS design tokens, Angular Material (M2 API), and Tailwind CSS v4.

### Path alias

`@core/*` maps to `src/app/core/*` (configured in `tsconfig.json`). Use it for core imports instead of relative paths.

### Directory layout (`src/app`)

- `core/` — app-wide singletons: NgRx store (`core/store`), services (`core/services`), language config (`core/configs`). `guards/`, `interceptors/`, `tokens/`, `constants/` exist as scaffolding for future use.
- `layouts/` — routed shell components that host a `<router-outlet>` plus chrome (`public-layout`, `dashboard-layout`). These are the top-level route components.
- `pages/` — the actual routed screens, grouped by shell: `pages/public/{home,about,login,sign-up,forgot-password}`, `pages/dashboard/{dashboard,user-management}`.
- `modules/` — **legacy**: `modules/auth/{login,sign-up}` and `modules/landing/landing-page` are no longer referenced by `app.routes.ts`. Add new screens under `pages/`, not here.
- `shared/components/` — reusable standalone components (`theme-switcher`, `lang-switcher`).
- `theme/` — SCSS design tokens (`color_variables.scss`) and Material theme setup (`_theme.scss`).
- `specs/` — architecture/spec docs in Markdown (`lang-switcher.md`, `theming.md`, `theme-switcher.md`, `ai-chat-widget.md`). Read the relevant one before touching i18n, theming, or the AI chat widget.
- `shared/directives|models|pipes|services|types`, `ui-kits/`, `utils/` — currently empty, reserved for growth.
- `design-flow/` (repo root) — SVG diagrams of the Angular ecosystem and the Tailwind/Material integration flow.

### Routing and SSR

- Client routes: `src/app/app.routes.ts`. Two route trees, each a lazy-loaded layout with lazy-loaded children: `''` → `PublicLayout`, `dashboard` → `DashboardLayout`. `**` redirects to `''`.
- Layout routes carry `data: { i18nModules: [...] }` — that is how translation modules get loaded (see i18n below).
- Server render modes: `src/app/app.routes.server.ts` — `''` and `about` are prerendered, everything else is `RenderMode.Client`. Adding a prerendered route means adding it here.
- SSR entry points: `src/main.server.ts`, `src/server.ts` (Express), `src/app/app.config.server.ts`.
- SSR safety: guard all browser-only APIs (`window`, `document`, `localStorage`, `matchMedia`) with `isPlatformBrowser`.

### State management (NgRx)

Feature state lives under `core/store/<feature>/` with `<feature>.actions.ts`, `.models.ts`, `.reducer.ts`, `.selectors.ts`. Everything is re-exported through `core/store/index.ts`. `app-store.providers.ts` wires `provideAppStore()`, registered in `app.config.ts`.

Persistence to `localStorage` is done via NgRx **meta-reducers** (`core/store/meta-reducers/`), not inside services — see `app-language-storage.metareducer.ts` for the pattern (read on `INIT`/`UPDATE`, write on every action).

### i18n (`@ngx-translate/core`)

Full flow documented in [src/app/specs/lang-switcher.md](src/app/specs/lang-switcher.md). Key points:

- Supported languages/default live in `core/configs/app-languages.config.ts`; language state is the NgRx `appLanguage` feature.
- `AppLanguageService` (started via `ENVIRONMENT_INITIALIZER` in `app.config.ts`) is the **only** thing that calls `translateService.use(...)`, driven by an `effect` on the store selector — never call `TranslateService.use()` from components.
- Translation JSON lives in `public/i18n/<module>/<lang>.json`. Existing modules: `generic-app`, `public`, `dashboard`, `auth`, `landing` — each with `en.json` and `bn.json`.
- `generic-app` (`GLOBAL_I18N_MODULE` in `module-translate.loader.ts`) is always loaded. Additional modules are resolved by `RouteTranslateLoaderService` on navigation from two sources: route `data.i18nModules` (the mechanism `app.routes.ts` uses today) and an optional `static i18nModules` on the routed component (still supported, used only by the legacy `modules/` components).
- Any standalone component using the `| translate` pipe must import `TranslatePipe` in its own `imports` array.
- Language also drives typography: `src/styles.scss` swaps `--app-font-family` on `html[lang="bn"]` (Bengali font stack) — don't hardcode `font-family`.

### Theming

Full flow documented in [src/app/specs/theming.md](src/app/specs/theming.md) and [src/app/specs/theme-switcher.md](src/app/specs/theme-switcher.md). Key points:

- Color tokens are defined once in `src/app/theme/color_variables.scss` (`$brand-colors`, `$light-theme-colors`, `$dark-theme-colors`) and exposed as CSS variables (`--color-primary`, etc.) plus Tailwind `@theme` tokens generated from `$app-colors` in `src/styles.scss`.
- Material theme palettes are configured separately in `src/app/theme/_theme.scss` (M2 API: `m2-define-palette`/`m2-define-light-theme`/`m2-define-dark-theme`) — keep these in sync with the token maps when changing brand colors.
- Runtime mode (`system`/`light`/`dark`) is owned by `ThemeService` (`core/services/theme.service.ts`), which applies the `data-theme` attribute + `.dark` class + `color-scheme` to both `html` and `body`. Tailwind `dark:` variants and SCSS `[data-theme='dark']` blocks both key off this.
- Tailwind v4 is wired through PostCSS (`.postcssrc.json` → `@tailwindcss/postcss`) with `@use "tailwindcss"` in `src/styles.scss`; `tailwind.config.js` only sets `content` and disables `preflight` so Angular Material owns base element resets — don't re-enable preflight without checking Material styling.
- Responsibility split: Material for complex interactive/accessible components, Tailwind for layout/spacing/composition, CSS variable tokens for cross-system color consistency.
- Keep styling consistent with the design-token system in `src/app/theme` and avoid introducing ad-hoc colors or hardcoded visual values.
