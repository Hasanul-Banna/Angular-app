# App Theming Guide

This project uses a **hybrid theming system**:

- **SCSS theme tokens** for app colors (brand + light/dark semantic colors)
- **Angular Material theme API** for Material component theming
- **Tailwind CSS v4** utility classes for layout, spacing, and fast custom UI styling

---

## 1) How Theming Works In This App

### Theme flow

```mermaid
flowchart TD
	A[color_variables.scss] --> B[_theme.scss]
	B --> C[CSS variables on :root and [data-theme='dark']]
	B --> D[Angular Material light/dark theme palettes]
	D --> E[Material component colors]
	C --> F[Tailwind utility classes using CSS vars]
	G[ThemeService] --> H[data-theme + .dark on html/body]
	H --> C
	H --> F
	H --> E
```

### Runtime switching

`ThemeService` controls the active mode:

- Preference: `system | light | dark`
- Resolves system theme via `matchMedia('(prefers-color-scheme: dark)')`
- Applies theme by setting:
	- `data-theme="light|dark"` on `html` and `body`
	- `.dark` class on `html` and `body`
	- `color-scheme` style for native controls

This means both selectors work together:

- `[data-theme='dark']` for SCSS/Material dark theme blocks
- `dark:` for Tailwind dark variants

---

## 2) Where To Change Theme Colors

### A) App semantic and brand colors (main customization point)

Edit:

- `src/app/theme/color_variables.scss`

You have three maps:

- `$brand-colors`
- `$light-theme-colors`
- `$dark-theme-colors`

These are merged into CSS variables like:

- `--color-primary`
- `--color-background`
- `--color-on-surface`
- `--color-border`

Use them in component SCSS/HTML via:

```scss
color: var(--color-primary);
background-color: var(--color-surface);
```

### B) Angular Material palettes

Edit:

- `src/app/theme/_theme.scss`

Material currently uses M2 palette definitions (`m2-define-palette`, `m2-define-light-theme`, `m2-define-dark-theme`).

Change these if you want Material buttons, menus, fields, etc. to use a different primary/accent/warn color family.

### C) Tailwind utility tokens

Tailwind is loaded in:

- `src/styles.scss`

It exposes SCSS token map values as Tailwind theme variables through:

```scss
@theme {
	--color-primary: ...;
	--color-background: ...;
}
```

So utility classes such as `text-primary`, `bg-primary`, `text-error` can map cleanly to your token system.

---

## 3) Material + Tailwind: How They Work Together Here

### Current setup

- Tailwind content scanning is enabled for `./src/**/*.{html,ts}`
- Tailwind `preflight` is disabled (`corePlugins.preflight = false`) so Angular Material keeps ownership of base element resets
- Angular Material provides component structure/behavior/accessibility
- Tailwind is used to tune layout, spacing, typography, surfaces, and interaction details around Material components

### Recommended responsibility split

- **Angular Material**:
	- Complex interactive components (menu, dialog, select, datepicker, form-field, table)
	- Keyboard/accessibility-heavy primitives
	- Consistent behavior/state logic
- **Tailwind**:
	- Grid/flex/layout
	- Spacing and sizing
	- View-level composition
	- Quick visual polish on containers and wrappers
- **CSS variables (tokens)**:
	- Brand and semantic color consistency across both systems

---

## 4) Best Way To Build UI/UX In This Project

Use this pipeline for clean, scalable work:

1. Define/adjust tokens first (`color_variables.scss`)
2. Ensure Material palettes still align (`_theme.scss`)
3. Build page structure with Tailwind utilities
4. Drop Material components where behavior matters
5. Use token-based classes/vars instead of hardcoded colors
6. Test in both light/dark + system mode

### Practical rules

- Prefer `text-primary`, `bg-surface`, `border-border` style token classes/vars over fixed color shades when possible
- Keep Material internals mostly untouched; style host/wrappers first
- Avoid overusing `!important` on Material elements unless absolutely needed
- When using `dark:` variants, verify `ThemeService` toggles `.dark` and `data-theme` correctly (already implemented)

---

## 5) Example: Add A New Brand Color

### Step 1: Add token

In `src/app/theme/color_variables.scss`:

```scss
$brand-colors: (
	"primary": #6366f1,
	"accent-strong": #0f766e,
	// ...
);
```

### Step 2: Use in UI

```html
<button class="bg-accent-strong text-white px-4 py-2 rounded-lg">
	Save
</button>
```

Or in SCSS:

```scss
.cta {
	background-color: var(--color-accent-strong);
	color: white;
}
```

---

## 6) Quick Checklist For Theme Customization

- Update token maps in `color_variables.scss`
- Update Material palette setup in `_theme.scss` if needed
- Keep `styles.scss` token export in sync
- Verify `ThemeSwitcher` toggles all modes
- Validate contrast in both modes (buttons, text, borders, disabled states)

---

## 7) Notes About Current State

- Project is using **Angular Material M2 theming APIs** (works fine)
- Tailwind is integrated via PostCSS plugin (`@tailwindcss/postcss`)
- `preflight` is intentionally disabled to reduce conflicts with Material base styles

If you later migrate to Material 3 design tokens, keep this same architecture (token source -> runtime mode switch -> utility + component theme consumers).
