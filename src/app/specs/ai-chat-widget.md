# AI Chat Widget (Gemini): Detailed Technical Spec

## 1. Purpose

The AI chat widget is a floating assistant, backed by Google's Gemini API, available from every route in the app (public and dashboard layouts alike).

It is designed so that:

- One ongoing conversation is available globally — no per-page chat state, no multi-conversation management.
- The Gemini API is called directly from the browser (there is no backend in this app), so replies stream back token-by-token.
- Conversation history persists across reloads/navigation via `localStorage`, following the same NgRx meta-reducer pattern already used for language persistence (see [lang-switcher.md](lang-switcher.md) §5).
- The widget degrades gracefully with a translated, retryable error message whenever Gemini can't be reached — missing key, network failure, quota limit, or any other failure.

Design/implementation history: `docs/superpowers/specs/2026-08-22-ai-chat-widget-design.md` and `docs/superpowers/plans/2026-08-22-ai-chat-widget.md` at the repo root.

---

## 2. Main Files and Responsibilities

- `src/app/shared/components/ai-chat-widget/ai-chat-widget.ts`
	- Floating button + panel component. Owns the async orchestration (calling Gemini, dispatching success/failure) — there is no `@ngrx/effects` in this app, so this component is the only place that bridges the store and the Gemini service.
- `src/app/shared/components/ai-chat-widget/ai-chat-widget.html`
	- FAB + expandable panel markup: header (title, "new chat", close), scrollable message list, streaming bubble, error bubble with Retry, and the send form.
- `src/app/core/services/gemini-chat.service.ts`
	- `GeminiChatService` — wraps `@google/genai`, exposes `streamReply(history): Observable<string>`, normalizes every failure into a `GeminiChatError`.
- `src/app/core/store/ai-chat/*`
	- `ai-chat.models.ts` — `ChatMessage`, `ChatStatus`, the `isChatMessage` runtime guard.
	- `ai-chat.actions.ts` — `AiChatActions` (`sendMessage`, `retryLastMessage`, `receiveMessageSuccess`, `receiveMessageFailure`, `clearConversation`).
	- `ai-chat.reducer.ts` — `aiChatReducer`, feature key `aiChat`.
	- `ai-chat.selectors.ts` — `selectAiChatMessages`, `selectAiChatStatus`, `selectAiChatError`.
- `src/app/core/store/meta-reducers/ai-chat-storage.metareducer.ts`
	- Persists/restores `messages` from `localStorage`.
- `src/app/core/store/app.state.ts` / `src/app/core/store/index.ts` / `src/app/core/store/app-store.providers.ts`
	- Wire the `aiChat` feature and its meta-reducer into the root store, alongside `appLanguage`.
- `src/environments/env.model.ts` / `env.ts` / `env.dev.ts` / `env.production.ts`
	- `geminiApiKey: string` field. All three committed environment files ship an **empty string** — no real key is ever committed.
- `public/i18n/generic-app/{en,bn}.json`
	- `aiChat.*` translation keys (the widget is global, so it lives in the always-loaded `generic-app` module — see [lang-switcher.md](lang-switcher.md) §9.1).
- `src/app/app.ts` + `src/app/app.html`
	- Mount `<app-ai-chat-widget />` once, next to `<router-outlet />`, so it renders on every route.

---

## 3. Data Model

From `ai-chat.models.ts`:

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

type ChatStatus = 'idle' | 'loading' | 'error';
```

`isChatMessage(value): value is ChatMessage` is a runtime type guard used only by the persistence meta-reducer, to validate whatever comes back out of `localStorage` before trusting it.

Store shape (`AiChatState`, feature key `aiChat`):

```typescript
interface AiChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
}
```

`error` is a `string`, not the narrower `GeminiErrorCode` union — it's expected to be one of `'missingKey' | 'network' | 'quota' | 'unknown'` by convention (that's what the component ever dispatches), but the type itself doesn't enforce it. The template resolves it as a translation key: `'aiChat.errors.' + error()`.

---

## 4. State Management Design (NgRx)

Actions (`AiChatActions`, source `'AI Chat'`):

| Action | Payload | Reducer effect |
|---|---|---|
| `sendMessage` | `{ message: ChatMessage }` | Appends the message, `status → 'loading'`, clears `error` |
| `retryLastMessage` | — | `status → 'loading'`, clears `error`; messages unchanged (the last user message is still in `messages`, so a retry just re-sends the existing history) |
| `receiveMessageSuccess` | `{ message: ChatMessage }` | Appends the assistant message, `status → 'idle'`, clears `error` |
| `receiveMessageFailure` | `{ error: string }` | `status → 'error'`, sets `error`; messages unchanged |
| `clearConversation` | — | Resets to the initial state (`messages: []`, `status: 'idle'`, `error: null`) |

Selectors: `selectAiChatMessages`, `selectAiChatStatus`, `selectAiChatError`, all derived from `selectAiChatState` (`createFeatureSelector('aiChat')`).

No `@ngrx/effects` is used anywhere in this app. The widget component dispatches `sendMessage`/`retryLastMessage` synchronously, then separately calls `GeminiChatService.streamReply(...)` and dispatches `receiveMessageSuccess`/`receiveMessageFailure` itself once the observable settles.

---

## 5. Persistence Flow (Meta Reducer)

Storage key: `ai-chat-history`.

Only `messages` is persisted — `status` and `error` are treated as transient/session-only and are never written to or read from storage. This means a page reload always resumes with `status: 'idle'`, even if the tab was closed mid-error.

On `INIT`/`UPDATE`:

1. Read `localStorage['ai-chat-history']`.
2. `JSON.parse` inside a try/catch — malformed JSON is treated as "nothing stored".
3. Validate the parsed value is an array where every entry passes `isChatMessage`. A partially-corrupt array (even one bad entry) is rejected wholesale, not filtered.
4. If valid, overwrite `messages` in the hydrated state.

On every dispatched action (any action, not just `aiChat` ones — same as the language meta-reducer):

1. Serialize the current `messages` array.
2. `window.localStorage.setItem(...)` inside a try/catch that silently swallows the error (e.g. `QuotaExceededError` on a very long conversation, or `SecurityError` in some private-browsing contexts). This matters specifically here — unlike the 2-byte language string, a long conversation is a realistic way to hit a storage quota, and an uncaught throw inside a meta-reducer would break every subsequent action app-wide, not just chat.

---

## 6. `GeminiChatService`

### 6.1 Public Surface

```typescript
streamReply(history: ChatMessage[]): Observable<string>
```

Each emission is the **accumulated** text so far, not just the new delta — the widget can render `streamingText()` directly without concatenating itself.

### 6.2 SSR Safety

`streamReply` checks `isPlatformBrowser` first. Off the browser platform, the returned observable completes immediately without emitting — no Gemini call, no `@google/genai` import, ever happens during server-side rendering or prerendering.

### 6.3 Lazy SDK Loading

`getClient()` is `async` and does **not** statically import `@google/genai`. Instead:

```typescript
private async getClient(): Promise<GeminiClient> {
  if (!environment.geminiApiKey) {
    throw new GeminiChatError('missingKey', 'Gemini API key is not configured.');
  }
  if (!this.client) {
    const { GoogleGenAI } = await import('@google/genai');
    this.client = new GoogleGenAI({ apiKey: environment.geminiApiKey });
  }
  return this.client;
}
```

Why this matters: `@google/genai`'s Node build pulls in `google-auth-library`, `protobufjs`, and other Node-only dependencies. A *static* top-level import in a `providedIn: 'root'` service, consumed by a component mounted at the app root, put the entire SDK into the initial bundle on every route — the production build failed its 1 MB budget until this was changed to a dynamic `import()`. The dynamic import also means a missing API key never even triggers loading the SDK, since the key check runs first and throws synchronously.

### 6.4 Error Normalization

Every failure — from the SDK, from the network, or a missing key — is normalized into:

```typescript
class GeminiChatError extends Error {
  constructor(readonly code: 'missingKey' | 'network' | 'quota' | 'unknown', message: string) { ... }
}
```

`toGeminiChatError` classifies raw SDK errors by matching their message text against regexes (`quota|rate.?limit|429` → `'quota'`, `network|fetch|failed to connect` → `'network'`, otherwise `'unknown'`). This is inherently a little fragile against future SDK message-format changes, but it's the only signal available without a documented error-code contract from the SDK.

### 6.5 Model

Fixed to `gemini-3.6-flash` (`GEMINI_MODEL` constant) — there is no model picker or configuration for this.

---

## 7. Widget Component Behavior

### 7.1 Local vs. Store State

- **Store** (`selectAiChatMessages`/`selectAiChatStatus`/`selectAiChatError`): the durable, persisted conversation — only ever holds **completed** messages.
- **Local signals** (`isOpen`, `draftMessage`, `streamingText`): ephemeral UI state. In particular, `streamingText` holds the in-flight partial reply and is *never* written to the store — it exists purely so the panel can render a live-updating bubble while a reply streams in.

### 7.2 Sending a Message

1. `sendMessage()` trims the draft; a blank draft or an in-flight stream (`isStreaming()`) is a no-op.
2. A `ChatMessage` is built with `crypto.randomUUID()` and `Date.now()`.
3. `AiChatActions.sendMessage({ message })` is dispatched (this appends to the store and flips `status` to `'loading'`).
4. `runStream()` is called.

### 7.3 `runStream()` — the async bridge

```typescript
private runStream(): void {
  this.streamingText.set('');
  this.streamSubscription?.unsubscribe();
  this.streamSubscription = this.geminiChatService.streamReply(this.messages()).subscribe({
    next: (accumulatedText) => this.streamingText.set(accumulatedText),
    error: (err) => { /* dispatch receiveMessageFailure with the mapped code */ },
    complete: () => {
      const finalText = this.streamingText();
      if (finalText) {
        /* dispatch receiveMessageSuccess with an assistant ChatMessage */
      } else {
        /* dispatch receiveMessageFailure({ error: 'unknown' }) */
      }
    },
  });
}
```

Two behaviors worth calling out explicitly:

- **Any prior in-flight stream is unsubscribed before a new one starts** (`this.streamSubscription?.unsubscribe()`). Both `sendMessage` → `runStream()` and `retryLastMessage()` → `runStream()` go through this same method, so a fast retry can never leave two streams running concurrently, and `clearConversation()` also unsubscribes before resetting state — starting a new chat mid-stream can't produce an orphaned assistant message appended after the reset. Unsubscribing closes the RxJS `Subscriber`, so a still-running `for await` loop inside the service becomes a no-op on its next `next`/`complete` call — but it does **not** cancel the underlying HTTP request to Gemini; the network call keeps running in the background even though its result is discarded.
- **An empty completed stream is treated as a failure**, not a silent success. If Gemini returns a blocked/empty response, `finalText` is `''`, and the `complete` handler dispatches `receiveMessageFailure({ error: 'unknown' })` instead of leaving `status` stuck at `'loading'` forever.

### 7.4 Retry

`retryLastMessage()` dispatches `AiChatActions.retryLastMessage()` (which just flips `status` back to `'loading'` and clears `error` — it does **not** re-append the user message, since it's already the last entry in `messages`) and calls `runStream()` with the existing message history.

### 7.5 New Chat

`clearConversation()` unsubscribes any in-flight stream, dispatches `AiChatActions.clearConversation()`, and clears `streamingText`. This is the only way to reset the conversation — there is no multi-conversation UI.

---

## 8. Template Structure

- A `mat-fab` toggle button, always visible, fixed bottom-right (`z-40`).
- When open, a panel above it: header (title + "new chat" refresh icon + close icon), a scrollable message list (`@for` over `messages()`, tracked by `message.id`), a streaming bubble (only rendered while `isStreaming() && streamingText()`), an error bubble (only rendered while `error()` is set, with a Retry button), and a send form (`ngModel`-bound text input + submit button, both disabled while streaming).
- Colors come from `--color-*` CSS variables (`--color-border`, `--color-surface`, `--color-surface-elevated`, `--color-on-surface`, `--color-gray-light`, `--color-error`, `--color-background`, `--color-primary`), so the panel is legible in both light and dark mode without any widget-specific theme code — see [theme-switcher.md](theme-switcher.md) for how `data-theme`/`.dark` get applied to `html`/`body`.
- Two `text-white` usages (the user-message bubble, the FAB icon) are literal, not token-based — this matches an existing app-wide convention (the dashboard/public layouts and several pages all use `text-white` on `bg-[var(--color-primary)]` surfaces, and there is no `--color-on-primary` token defined yet). The panel's box-shadow, by contrast, is derived from a token: `color-mix(in srgb, var(--color-dark) 24%, transparent)`.
- Every `<button>` has an explicit `type` attribute; the template uses `@if`/`@for` exclusively (no `*ngIf`/`*ngFor`).

---

## 9. i18n

Keys live in `public/i18n/generic-app/{en,bn}.json` under `aiChat`:

- `toggleOpen`, `toggleClose` — FAB `aria-label` depending on open/closed state.
- `panelTitle`, `placeholder`, `send`, `newChat`, `retry` — static UI strings.
- `errors.missingKey`, `errors.network`, `errors.quota`, `errors.unknown` — one per `GeminiErrorCode`, resolved via `'aiChat.errors.' + error() | translate`.

Because `generic-app` is the module always loaded on every route (see [lang-switcher.md](lang-switcher.md) §9.1), no route needs `data.i18nModules` wiring for these keys to resolve — the widget's translations are available from the very first paint, on any page.

---

## 10. SSR and Browser Guards

- `GeminiChatService.streamReply` never touches the SDK off the browser platform (§6.2) — it completes immediately.
- `ai-chat-storage.metareducer.ts` uses the same `supportsBrowserStorage()` pattern as the language meta-reducer (`typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'`) before any `localStorage` read/write.
- `crypto.randomUUID()` in the widget is only ever called from a user-initiated event handler (`sendMessage`/`retryLastMessage`/`receiveMessageSuccess`'s constructed message), never during render, so it never runs during SSR.

---

## 11. End-to-End Runtime Sequence (Send → Stream → Persist)

```mermaid
sequenceDiagram
	participant U as User
	participant C as AiChatWidget
	participant ST as NgRx Store
	participant MR as ai-chat MetaReducer
	participant GS as GeminiChatService
	participant G as Gemini API
	participant LS as localStorage

	U->>C: Type message, submit
	C->>ST: dispatch sendMessage({ message })
	ST->>ST: reducer appends message, status="loading"
	ST->>MR: meta-reducer persistence pass
	MR->>LS: save ai-chat-history (messages only)
	C->>GS: streamReply(messages)
	GS->>GS: getClient() — dynamic import('@google/genai'), lazy construct
	GS->>G: generateContentStream(...)
	loop each chunk
		G-->>GS: text chunk
		GS-->>C: accumulated text
		C->>C: streamingText.set(accumulated)
	end
	G-->>GS: stream complete
	GS-->>C: observable completes
	C->>ST: dispatch receiveMessageSuccess({ message })
	ST->>MR: meta-reducer persistence pass
	MR->>LS: save ai-chat-history (now includes the reply)
```

---

## 12. Bootstrap Sequence

```mermaid
flowchart TD
	A[app.config.ts providers] --> B[provideAppStore with appLanguage + aiChat meta-reducers]
	C[app.html] --> D["app-ai-chat-widget mounted next to router-outlet"]
	B --> E[Store INIT/UPDATE restores saved ai-chat-history]
	D --> F[Widget reads selectAiChatMessages/Status/Error via selectSignal]
	D --> G["GeminiChatService injected — SDK not loaded yet"]
```

---

## 13. Edge Cases and Expected Results

- **No API key configured** (`geminiApiKey: ''`, the default in every committed environment file): every `streamReply` call fails immediately with `GeminiChatError('missingKey', ...)`, the SDK is never loaded, and the panel shows the translated "not configured" message with a Retry button (retrying will fail the same way until a real key is set locally).
- **Blocked/empty Gemini response**: treated as a failure (`error: 'unknown'`), not a silent no-op — see §7.3.
- **"New chat" clicked mid-stream**: the in-flight subscription is unsubscribed; no assistant message from the abandoned stream can be appended afterward. The underlying HTTP request to Gemini is not aborted, only its result is discarded — this wastes a small amount of quota/bandwidth but causes no visible or state bug.
- **Retry clicked twice quickly, or Send clicked while already streaming**: `runStream()`'s unsubscribe-before-subscribe guard means only the latest stream can ever affect the store; `sendMessage()` additionally no-ops entirely while `isStreaming()` is true.
- **Corrupted/tampered `localStorage['ai-chat-history']`**: any parse failure, non-array value, or array containing even one entry that fails `isChatMessage` is treated as "nothing stored" — the conversation starts empty rather than crashing.
- **`localStorage.setItem` throws** (quota exceeded, private-mode restrictions): silently ignored; the conversation still works for the current session, it just won't survive a reload.
- **SSR / prerendering** (`/` and `/about` are prerendered per `app.routes.server.ts`): the widget's static markup renders, but no Gemini call and no `localStorage` access ever happens server-side.

---

## 14. What This Widget Does *Not* Do

- **No server-side proxy for the API key.** The Gemini API key is read from `environment.geminiApiKey` and the call happens directly from the browser. Anyone who opens dev tools on a deployment with a real key configured can see it. This is an explicit, accepted trade-off for a backend-less app, not an oversight — see §16 for how to configure a key safely for local development, and treat moving this behind a real backend as a prerequisite for any public deployment with a live key.
- **No `@ngrx/effects`.** All async orchestration is plain component code (§7.3), by design.
- **No multiple/named conversations.** There is exactly one ongoing conversation; "New chat" discards it, it does not save/archive it anywhere.
- **No cancellation of the underlying Gemini request.** Unsubscribing stops the widget from acting on further chunks, but does not send an abort signal — the network request keeps running to completion in the background (see the "New chat mid-stream" edge case above).
- **No automated interactive-browser test coverage.** Only the NgRx reducer and `GeminiChatService` (with a mocked client) have unit specs. There is no E2E/integration test that actually opens the panel, sends a message, and asserts on rendered DOM — that verification has so far been manual/visual only.
- **No streaming request retry/backoff.** A network blip mid-stream surfaces as a `network` error with a manual Retry button; there's no automatic reconnect.
- **No configurable model or generation parameters.** The model (`gemini-3.6-flash`) is a hardcoded constant; there's no UI or config for temperature, max tokens, system instructions, etc.

---

## 15. How to Extend

- **Add a new error code**: extend `GeminiErrorCode` in `gemini-chat.service.ts`, add a matching classification rule in `toGeminiChatError`, and add the corresponding `aiChat.errors.<code>` key to both `en.json` and `bn.json`.
- **Change the model**: edit the `GEMINI_MODEL` constant in `gemini-chat.service.ts`.
- **Move the key server-side**: replace `GeminiChatService`'s direct `@google/genai` usage with an `HttpClient` call to a new backend endpoint that holds the real key; the widget component doesn't need to change at all, since it only depends on `streamReply`'s `Observable<string>` contract.
- **Cap persisted history**: `ai-chat-storage.metareducer.ts`'s `persistMessages` currently serializes the full `messages` array on every action; trimming to the last N messages before `JSON.stringify` would bound both the storage write cost and the reducer overhead for very long conversations.

---

## 16. Local Development: Setting a Real API Key

`src/environments/env.dev.ts` (used by `npm run dev`) ships with `geminiApiKey: ''` and **must never have a real key committed into it** — it's a tracked file.

For local testing, put a real key in `src/environments/env.local.ts` instead — that file is listed in `.gitignore` (`/src/environments/env.local.ts`) specifically so a real key never risks being committed. It's wired into a dedicated `local` build/serve configuration in `angular.json` (`fileReplacements` swaps `env.ts` → `env.local.ts`) — run `npm run dev:local` (or `npm run build:local`) to pick it up.

---

## 17. Quick Verification Checklist

1. Load any route (`/`, `/dashboard`, etc.) — the floating chat button should appear bottom-right on every one of them.
2. Click it — the panel opens; click again (or the close icon) — it closes.
3. With no `geminiApiKey` configured, send a message — it should appear in the list, then the "AI chat is not configured" error bubble should appear with a working Retry button; the input/send button should re-enable (not stay stuck disabled).
4. With a real key configured locally, send a message — it should stream in incrementally, then settle as a completed assistant message.
5. Click "New chat" — the conversation should clear immediately.
6. Reload the page after sending at least one message — the prior conversation should reappear (persisted via `localStorage['ai-chat-history']`).
7. Switch language while the panel is open — panel title/placeholder/buttons should update to the new language immediately.
8. Switch theme while the panel is open — panel should remain legible in both light and dark mode.
