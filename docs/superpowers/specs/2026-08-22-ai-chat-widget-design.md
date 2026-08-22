# AI Chat Widget (Gemini) — Design

## Summary

Add a floating AI chat widget, backed by Google's Gemini API via the `@google/genai` SDK, available on every route (public and dashboard layouts). Called directly from the browser (no backend exists in this app), with conversation history persisted to `localStorage` through an NgRx feature store, following the same pattern already used for language persistence.

## Goals

- A floating chat bubble + expandable panel, mounted globally (once, at the app root), usable from any page.
- Multi-turn conversation with Gemini, streamed token-by-token into the panel.
- Conversation history persists across reloads/navigation via `localStorage`.
- Fully theme-aware (light/dark) and translated (EN/BN), consistent with existing conventions.

## Non-goals

- No backend/server-side proxy for the Gemini API key. The key ships in the browser bundle via environment config — acceptable for local/personal use only. Moving to a server-side proxy is a future enhancement, not part of this spec.
- No `@ngrx/effects` — not installed in this repo and not introduced here. Async orchestration happens directly in the widget component.
- No multi-conversation / conversation history list — a single ongoing conversation with a "New chat" reset action.
- No E2E test coverage.

## Architecture

### State (NgRx)

New feature `aiChat`, mirroring the existing `appLanguage` feature:

- `src/app/core/store/ai-chat/ai-chat.models.ts` — `ChatMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: number }`, `ChatStatus = 'idle' | 'loading' | 'error'`.
- `src/app/core/store/ai-chat/ai-chat.actions.ts` — `createActionGroup` with events: `Send Message` (`{ content: string }`), `Receive Message Success` (`{ content: string }`), `Receive Message Failure` (`{ error: string }`), `Clear Conversation`.
- `src/app/core/store/ai-chat/ai-chat.reducer.ts` — `AiChatState { messages: ChatMessage[]; status: ChatStatus; error: string | null }`. `sendMessage` appends a user message and sets `status: 'loading'`. `receiveMessageSuccess` appends an assistant message and resets to `idle`. `receiveMessageFailure` sets `status: 'error'` + `error` message, leaving prior messages intact. `clearConversation` resets to initial state.
- `src/app/core/store/ai-chat/ai-chat.selectors.ts` — `selectAiChatState`, `selectAiChatMessages`, `selectAiChatStatus`, `selectAiChatError`.
- Wire `aiChatFeatureKey`/`aiChatReducer` into `app.state.ts` (`AppState`, `appReducers`) and re-export from `core/store/index.ts`, same as `appLanguage`.

### Persistence (meta-reducer)

- `src/app/core/store/meta-reducers/ai-chat-storage.metareducer.ts`, modeled directly on `app-language-storage.metareducer.ts`:
  - Storage key: `ai-chat-history`.
  - On `INIT`/`UPDATE`, reads stored `messages` array (validated to be an array of well-formed `ChatMessage` objects) and hydrates state.
  - On every action, persists the current `messages` array (not `status`/`error`, which are transient/session-only).
  - Same `supportsBrowserStorage()` SSR guard as the existing metareducer.
  - Registered alongside `appLanguageStorageMetaReducer` in `app-store.providers.ts`.

### Gemini service

- `src/app/core/services/gemini-chat.service.ts`, `@Injectable({ providedIn: 'root' })`.
- Constructs a `GoogleGenAI` client lazily, only when `isPlatformBrowser(this.platformId)` is true (never during SSR).
- `streamReply(history: ChatMessage[]): Observable<string>` — maps `history` to the SDK's content format, calls `generateContentStream` on a fixed model (`gemini-2.5-flash`), and emits the **accumulated** text so far on each chunk (not just the delta), so the consuming component can render it directly without concatenation logic.
- Wraps SDK errors (missing key, network, quota) into a normalized `Error` with a translatable error code (`'missingKey' | 'network' | 'quota' | 'unknown'`) so the widget can show a translated message instead of a raw SDK error string.

### Widget component

- `src/app/shared/components/ai-chat-widget/` (`ai-chat-widget.ts` / `.html` / `.scss`), standalone, `app-ai-chat-widget` selector, imports `TranslatePipe` and needed Angular Material modules (icon button for the toggle, form field/input for the message box).
- Local component signals: `isOpen`, `draftMessage`, `streamingText` (the in-flight partial assistant reply — never written to the store).
- Reads `messages`/`status`/`error` from the store via `store.selectSignal(...)`.
- On submit: dispatches `sendMessage`, calls `geminiChatService.streamReply(...)`, updates `streamingText` on each emission, and on completion dispatches `receiveMessageSuccess` with the final text (clearing `streamingText`). On error, dispatches `receiveMessageFailure` and clears `streamingText`.
- "New chat" button dispatches `clearConversation`.
- Retry: re-submits the content of the last user message when `status === 'error'`.
- Styling: Material for the toggle button/panel shell, Tailwind for layout/spacing, theme tokens from `src/app/theme/color_variables.scss` — no hardcoded colors, dark-mode via existing `data-theme`/`.dark` mechanism.

### Mounting

- `src/app/app.html` — add `<app-ai-chat-widget />` next to `<router-outlet>`; `src/app/app.ts` adds `AiChatWidget` to `imports`.

### Environment / config

- `src/environments/env.model.ts` — add `geminiApiKey: string`.
- `env.dev.ts` / `env.production.ts` — add the field (dev can point at a placeholder/empty string; real key supplied via local override, not committed).
- `package.json` — add `@google/genai` dependency.

### i18n

- Add an `aiChat` section to `public/i18n/generic-app/en.json` and `bn.json` (this module is always loaded, matching the widget's global availability): keys for the toggle button's accessible label, panel title, placeholder text, send button, "New chat", and error messages per error code (`missingKey`, `network`, `quota`, `unknown`).

## Data flow (end to end)

1. User opens the panel (bubble click) and types a message, hits send.
2. Component dispatches `sendMessage({ content })` → reducer appends the user `ChatMessage`, sets `status: 'loading'`.
3. Component calls `geminiChatService.streamReply(messages)`; subscribes and updates `streamingText` signal on each emission — panel re-renders the partial reply live.
4. Stream completes → component dispatches `receiveMessageSuccess({ content: finalText })`, clears `streamingText`; metareducer persists the updated `messages` array to `localStorage`.
5. Stream errors → component dispatches `receiveMessageFailure({ error: code })`; panel shows a translated inline error bubble with a "Retry" action.

## Error handling & edge cases

- Missing/invalid API key or quota errors: normalized by `GeminiChatService`, rendered as a translated inline message, never a raw SDK exception.
- SSR: widget markup renders during SSR; the Gemini client and any API call are skipped until the browser platform check passes post-hydration.
- `localStorage` unavailable (SSR, storage disabled): same `supportsBrowserStorage()`-style guard as the existing language metareducer — falls back to in-memory-only for that session, no thrown errors.
- Malformed/tampered `localStorage` content: metareducer validates shape before hydrating; invalid content is ignored (treated as no stored history) rather than crashing the app.

## Testing

The repo currently has zero `*.spec.ts` files — these will be the first:

- `ai-chat.reducer.spec.ts` — pure reducer tests for `sendMessage` / `receiveMessageSuccess` / `receiveMessageFailure` / `clearConversation`.
- `gemini-chat.service.spec.ts` — mocks the `@google/genai` client to verify streaming accumulation and error-code mapping (missing key, network, quota, unknown), without making real network calls.

No E2E coverage is included in this spec.

## Open items deferred (explicitly out of scope)

- Moving the Gemini key behind a server-side proxy (recommended before any public deployment, not needed for current local-only use).
- Multiple/named conversations, conversation export, or message editing.
