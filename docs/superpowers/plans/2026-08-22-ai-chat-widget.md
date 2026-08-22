# AI Chat Widget (Gemini) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating AI chat widget, backed by Google Gemini via the `@google/genai` SDK, mounted globally in the app so it's usable from any route, with streamed replies and `localStorage`-persisted conversation history.

**Architecture:** A new NgRx feature (`aiChat`) holds finished messages + status, following the exact same models/actions/reducer/selectors + meta-reducer pattern as the existing `appLanguage` feature. A `GeminiChatService` wraps `@google/genai`, called only in the browser, and streams accumulated text back as an `Observable<string>`. A standalone `AiChatWidget` component (mounted once in `app.html`) owns the UI and the async orchestration — dispatching store actions directly, no `@ngrx/effects`.

**Tech Stack:** Angular 21 standalone components, NgRx `@ngrx/store` (no `@ngrx/effects`), `@google/genai`, Angular Material (button/icon) + Tailwind CSS v4, `@ngx-translate/core`.

**Design doc:** `docs/superpowers/specs/2026-08-22-ai-chat-widget-design.md`

## Global Constraints

- No backend/server-side proxy for the Gemini API key — it is read from `environment.geminiApiKey` and the call is made directly from the browser.
- No `@ngrx/effects` is introduced. Async orchestration (calling Gemini, dispatching success/failure) happens directly in the widget component.
- Single ongoing conversation only — no multi-conversation management. "New chat" dispatches `clearConversation`.
- `localStorage` access must always be guarded (SSR safety), matching the `supportsBrowserStorage()` pattern already used in `app-language-storage.metareducer.ts`.
- Type-only imports must be inline (`import { type X } from '...'`).
- All user-facing strings must exist in both `public/i18n/generic-app/en.json` and `public/i18n/generic-app/bn.json` (the widget is global, so it belongs in the always-loaded `generic-app` module).
- Component selector: `app-ai-chat-widget` (kebab-case, `app` prefix). No hardcoded colors — use the `--color-*` tokens from `src/app/theme/color_variables.scss`.
- `@if`/`@for` control flow only in templates (no `*ngIf`/`*ngFor`); every `<button>` needs an explicit `type` attribute.
- New internal imports within `core/store` and `core/services` use relative paths (matching existing files there); new code in `shared/components` importing from `core` uses the `@core/*` path alias per `CLAUDE.md`.

---

## Task 1: `aiChat` NgRx feature (models, actions, reducer, selectors)

**Files:**
- Create: `src/app/core/store/ai-chat/ai-chat.models.ts`
- Create: `src/app/core/store/ai-chat/ai-chat.actions.ts`
- Create: `src/app/core/store/ai-chat/ai-chat.reducer.ts`
- Create: `src/app/core/store/ai-chat/ai-chat.reducer.spec.ts`
- Create: `src/app/core/store/ai-chat/ai-chat.selectors.ts`
- Modify: `src/app/core/store/app.state.ts`
- Modify: `src/app/core/store/index.ts`

**Interfaces:**
- Produces: `ChatMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: number }`, `ChatStatus = 'idle' | 'loading' | 'error'`, `isChatMessage(value: unknown): value is ChatMessage` (from `ai-chat.models.ts`) — Task 2's meta-reducer and Task 3's service consume these. `AiChatActions` with events `sendMessage({ message })`, `retryLastMessage()`, `receiveMessageSuccess({ message })`, `receiveMessageFailure({ error })`, `clearConversation()` — Task 4's widget dispatches these. `aiChatFeatureKey`, `AiChatState`, `aiChatReducer` — Task 2 registers the reducer's persistence. `selectAiChatMessages`, `selectAiChatStatus`, `selectAiChatError` — Task 4's widget reads these.

- [ ] **Step 1: Create `ai-chat.models.ts`**

```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export type ChatStatus = 'idle' | 'loading' | 'error';

export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate['id'] === 'string' &&
    (candidate['role'] === 'user' || candidate['role'] === 'assistant') &&
    typeof candidate['content'] === 'string' &&
    typeof candidate['createdAt'] === 'number'
  );
}
```

- [ ] **Step 2: Create `ai-chat.actions.ts`**

```typescript
import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { type ChatMessage } from './ai-chat.models';

export const AiChatActions = createActionGroup({
  source: 'AI Chat',
  events: {
    'Send Message': props<{ message: ChatMessage }>(),
    'Retry Last Message': emptyProps(),
    'Receive Message Success': props<{ message: ChatMessage }>(),
    'Receive Message Failure': props<{ error: string }>(),
    'Clear Conversation': emptyProps(),
  },
});
```

- [ ] **Step 3: Write the failing reducer test — create `ai-chat.reducer.spec.ts`**

```typescript
import { AiChatActions } from './ai-chat.actions';
import { type ChatMessage } from './ai-chat.models';
import { aiChatReducer, type AiChatState } from './ai-chat.reducer';

describe('aiChatReducer', () => {
  const userMessage: ChatMessage = {
    id: 'user-1',
    role: 'user',
    content: 'Hello',
    createdAt: 1000,
  };

  const assistantMessage: ChatMessage = {
    id: 'assistant-1',
    role: 'assistant',
    content: 'Hi there',
    createdAt: 2000,
  };

  it('appends the user message and sets status to loading on sendMessage', () => {
    const initialState: AiChatState = { messages: [], status: 'idle', error: null };

    const state = aiChatReducer(initialState, AiChatActions.sendMessage({ message: userMessage }));

    expect(state.messages).toEqual([userMessage]);
    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
  });

  it('appends the assistant message and resets status to idle on receiveMessageSuccess', () => {
    const initialState: AiChatState = { messages: [userMessage], status: 'loading', error: null };

    const state = aiChatReducer(
      initialState,
      AiChatActions.receiveMessageSuccess({ message: assistantMessage })
    );

    expect(state.messages).toEqual([userMessage, assistantMessage]);
    expect(state.status).toBe('idle');
  });

  it('sets status to error and stores the error code on receiveMessageFailure, keeping prior messages', () => {
    const initialState: AiChatState = { messages: [userMessage], status: 'loading', error: null };

    const state = aiChatReducer(
      initialState,
      AiChatActions.receiveMessageFailure({ error: 'network' })
    );

    expect(state.messages).toEqual([userMessage]);
    expect(state.status).toBe('error');
    expect(state.error).toBe('network');
  });

  it('resets status to loading and clears the error on retryLastMessage', () => {
    const initialState: AiChatState = { messages: [userMessage], status: 'error', error: 'network' };

    const state = aiChatReducer(initialState, AiChatActions.retryLastMessage());

    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
    expect(state.messages).toEqual([userMessage]);
  });

  it('resets to the initial state on clearConversation', () => {
    const initialState: AiChatState = { messages: [userMessage], status: 'error', error: 'network' };

    const state = aiChatReducer(initialState, AiChatActions.clearConversation());

    expect(state.messages).toEqual([]);
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `ng test --include='**/ai-chat.reducer.spec.ts'`
Expected: FAIL to compile — `Cannot find module './ai-chat.reducer'` (it doesn't exist yet).

- [ ] **Step 5: Create `ai-chat.reducer.ts`**

```typescript
import { createReducer, on } from '@ngrx/store';

import { AiChatActions } from './ai-chat.actions';
import { type ChatStatus, type ChatMessage } from './ai-chat.models';

export const aiChatFeatureKey = 'aiChat';

export interface AiChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
}

const initialState: AiChatState = {
  messages: [],
  status: 'idle',
  error: null,
};

export const aiChatReducer = createReducer(
  initialState,
  on(AiChatActions.sendMessage, (state, { message }): AiChatState => ({
    ...state,
    messages: [...state.messages, message],
    status: 'loading',
    error: null,
  })),
  on(AiChatActions.retryLastMessage, (state): AiChatState => ({
    ...state,
    status: 'loading',
    error: null,
  })),
  on(AiChatActions.receiveMessageSuccess, (state, { message }): AiChatState => ({
    ...state,
    messages: [...state.messages, message],
    status: 'idle',
    error: null,
  })),
  on(AiChatActions.receiveMessageFailure, (state, { error }): AiChatState => ({
    ...state,
    status: 'error',
    error,
  })),
  on(AiChatActions.clearConversation, (): AiChatState => initialState)
);
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `ng test --include='**/ai-chat.reducer.spec.ts'`
Expected: PASS — 5 specs, 0 failures.

- [ ] **Step 7: Create `ai-chat.selectors.ts`**

```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';

import { type AppState } from '../app.state';
import { type AiChatState, aiChatFeatureKey } from './ai-chat.reducer';

export const selectAiChatState = createFeatureSelector<AppState, AiChatState>(
  aiChatFeatureKey
);

export const selectAiChatMessages = createSelector(
  selectAiChatState,
  (state) => state.messages
);

export const selectAiChatStatus = createSelector(
  selectAiChatState,
  (state) => state.status
);

export const selectAiChatError = createSelector(
  selectAiChatState,
  (state) => state.error
);
```

- [ ] **Step 8: Wire the feature into `app.state.ts`**

Replace the full contents of `src/app/core/store/app.state.ts` with:

```typescript
import { type ActionReducerMap } from '@ngrx/store';

import {
  type AppLanguageState,
  appLanguageFeatureKey,
  appLanguageReducer,
} from './app-language/app-language.reducer';
import {
  type AiChatState,
  aiChatFeatureKey,
  aiChatReducer,
} from './ai-chat/ai-chat.reducer';

export interface AppState {
  [appLanguageFeatureKey]: AppLanguageState;
  [aiChatFeatureKey]: AiChatState;
}

export const appReducers: ActionReducerMap<AppState> = {
  [appLanguageFeatureKey]: appLanguageReducer,
  [aiChatFeatureKey]: aiChatReducer,
};
```

- [ ] **Step 9: Re-export the feature from `core/store/index.ts`**

Replace the full contents of `src/app/core/store/index.ts` with:

```typescript
export * from './app-store.providers';
export * from './app.state';
export * from './app-language/app-language.actions';
export * from './app-language/app-language.models';
export * from './app-language/app-language.reducer';
export * from './app-language/app-language.selectors';
export * from './ai-chat/ai-chat.actions';
export * from './ai-chat/ai-chat.models';
export * from './ai-chat/ai-chat.reducer';
export * from './ai-chat/ai-chat.selectors';
```

- [ ] **Step 10: Run the full test suite and lint to confirm the wiring compiles**

Run: `ng test --include='**/ai-chat.reducer.spec.ts'` — Expected: PASS
Run: `ng lint --lint-file-patterns 'src/app/core/store/**/*.ts'` — Expected: no errors

- [ ] **Step 11: Commit**

```bash
git add src/app/core/store/ai-chat src/app/core/store/app.state.ts src/app/core/store/index.ts
git commit -m "feat: add aiChat NgRx feature (models, actions, reducer, selectors)"
```

---

## Task 2: Persist conversation history to `localStorage`

**Files:**
- Create: `src/app/core/store/meta-reducers/ai-chat-storage.metareducer.ts`
- Modify: `src/app/core/store/app-store.providers.ts`

**Interfaces:**
- Consumes: `AppState`, `ChatMessage`, `isChatMessage`, `aiChatFeatureKey` from Task 1.
- Produces: `aiChatStorageMetaReducer` — registered as a `MetaReducer<AppState>` in `app-store.providers.ts`.

- [ ] **Step 1: Create `ai-chat-storage.metareducer.ts`**

```typescript
import { type Action, type ActionReducer, INIT, UPDATE } from '@ngrx/store';

import { type AppState } from '../app.state';
import { type ChatMessage, isChatMessage } from '../ai-chat/ai-chat.models';
import { aiChatFeatureKey } from '../ai-chat/ai-chat.reducer';

const AI_CHAT_STORAGE_KEY = 'ai-chat-history';

export function aiChatStorageMetaReducer(
  reducer: ActionReducer<AppState>
): ActionReducer<AppState> {
  return (state: AppState | undefined, action: Action): AppState => {
    const nextState = reducer(state, action);

    if (action.type === INIT || action.type === UPDATE) {
      const storedMessages = readStoredMessages();

      if (storedMessages) {
        return {
          ...nextState,
          [aiChatFeatureKey]: {
            ...nextState[aiChatFeatureKey],
            messages: storedMessages,
          },
        };
      }
    }

    persistMessages(nextState[aiChatFeatureKey]?.messages ?? []);

    return nextState;
  };
}

function readStoredMessages(): ChatMessage[] | null {
  if (!supportsBrowserStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(AI_CHAT_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.every(isChatMessage)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function persistMessages(messages: ChatMessage[]): void {
  if (!supportsBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(messages));
}

function supportsBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
```

- [ ] **Step 2: Register the meta-reducer — replace the full contents of `app-store.providers.ts`**

```typescript
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
```

- [ ] **Step 3: Verify the app still builds and existing tests still pass**

Run: `ng test --include='**/ai-chat.reducer.spec.ts'` — Expected: PASS
Run: `ng lint --lint-file-patterns 'src/app/core/store/**/*.ts'` — Expected: no errors

- [ ] **Step 4: Manually verify persistence in the browser**

Run: `npm run dev`, open `http://localhost:4200/`, open DevTools console, run:
```javascript
window.localStorage.setItem('ai-chat-history', JSON.stringify([{ id: '1', role: 'user', content: 'test', createdAt: Date.now() }]));
```
then reload the page and inspect the NgRx state (e.g. via Redux DevTools if installed, or temporarily log `store.select(selectAiChatMessages)` from the console) to confirm the seeded message hydrates into `aiChat.messages`. Remove the test key afterward with `window.localStorage.removeItem('ai-chat-history')`.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/store/meta-reducers/ai-chat-storage.metareducer.ts src/app/core/store/app-store.providers.ts
git commit -m "feat: persist ai chat history to localStorage via meta-reducer"
```

---

## Task 3: Gemini API client and `GeminiChatService`

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `src/environments/env.model.ts`
- Modify: `src/environments/env.ts`
- Modify: `src/environments/env.dev.ts`
- Modify: `src/environments/env.production.ts`
- Create: `src/app/core/services/gemini-chat.service.ts`
- Create: `src/app/core/services/gemini-chat.service.spec.ts`

**Interfaces:**
- Consumes: `ChatMessage` from Task 1 (`core/store/ai-chat/ai-chat.models.ts`).
- Produces: `GeminiChatService.streamReply(history: ChatMessage[]): Observable<string>` (emits accumulated text per chunk), `GeminiChatError` (`{ code: GeminiErrorCode; message: string }`), `GeminiErrorCode = 'missingKey' | 'network' | 'quota' | 'unknown'` — Task 4's widget calls `streamReply` and catches `GeminiChatError`.

- [ ] **Step 1: Install the SDK**

Run: `npm install @google/genai`
Expected: `package.json` gains a `@google/genai` entry under `dependencies`.

- [ ] **Step 2: Add `geminiApiKey` to the environment model — modify `src/environments/env.model.ts`**

```typescript
export interface AppEnvironment {
	production: boolean;
	baseUrl: string;
	apiBaseUrl: string;
	authBaseUrl: string;
	appName: string;
	defaultLanguage: string;
	enableDebugTools: boolean;
	geminiApiKey: string;
}
```

- [ ] **Step 3: Add the field to each environment file**

`src/environments/env.ts`:

```typescript
import { type AppEnvironment } from './env.model';

export const environment: AppEnvironment = {
	production: false,
	baseUrl: 'http://localhost:4200',
	apiBaseUrl: 'http://localhost:3000/api',
	authBaseUrl: 'http://localhost:3000/auth',
	appName: 'Angular 21 App',
	defaultLanguage: 'en',
	enableDebugTools: true,
	geminiApiKey: '',
};
```

`src/environments/env.dev.ts`:

```typescript
import { type AppEnvironment } from './env.model';

export const environment: AppEnvironment = {
	production: false,
	baseUrl: 'http://localhost:4200',
	apiBaseUrl: 'http://localhost:3000/api',
	authBaseUrl: 'http://localhost:3000/auth',
	appName: 'Angular 21 App (Dev)',
	defaultLanguage: 'en',
	enableDebugTools: true,
	geminiApiKey: '',
};
```

`src/environments/env.production.ts`:

```typescript
import { type AppEnvironment } from './env.model';

export const environment: AppEnvironment = {
	production: true,
	baseUrl: 'https://app.example.com',
	apiBaseUrl: 'https://api.example.com',
	authBaseUrl: 'https://auth.example.com',
	appName: 'Angular 21 App',
	defaultLanguage: 'en',
	enableDebugTools: false,
	geminiApiKey: '',
};
```

After this step, set your real key locally in `src/environments/env.dev.ts` (the file used by `npm run dev`) to actually talk to Gemini — do not commit a real key.

- [ ] **Step 4: Write the failing service test — create `gemini-chat.service.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';

import { type ChatMessage } from '../store/ai-chat/ai-chat.models';
import { GeminiChatError, GeminiChatService } from './gemini-chat.service';

interface FakeClient {
  models: { generateContentStream: jasmine.Spy };
}

describe('GeminiChatService', () => {
  let service: GeminiChatService;

  const history: ChatMessage[] = [
    { id: '1', role: 'user', content: 'Hello', createdAt: 1 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeminiChatService);
  });

  function withFakeClient(client: FakeClient): void {
    (service as unknown as { getClient: () => FakeClient }).getClient = () => client;
  }

  function fakeStreamingClient(chunks: string[]): FakeClient {
    return {
      models: {
        generateContentStream: jasmine.createSpy('generateContentStream').and.resolveTo(
          (async function* () {
            for (const chunk of chunks) {
              yield { text: chunk };
            }
          })()
        ),
      },
    };
  }

  it('emits accumulated text for each streamed chunk', async () => {
    withFakeClient(fakeStreamingClient(['Hi', ' there']));

    const emissions: string[] = [];

    await new Promise<void>((resolve, reject) => {
      service.streamReply(history).subscribe({
        next: (value) => emissions.push(value),
        error: reject,
        complete: resolve,
      });
    });

    expect(emissions).toEqual(['Hi', 'Hi there']);
  });

  it('maps a quota-related SDK error to the quota error code', async () => {
    withFakeClient({
      models: {
        generateContentStream: jasmine
          .createSpy('generateContentStream')
          .and.rejectWith(new Error('429 Too Many Requests: quota exceeded')),
      },
    });

    let caught: unknown;

    await new Promise<void>((resolve) => {
      service.streamReply(history).subscribe({
        next: () => undefined,
        error: (err: unknown) => {
          caught = err;
          resolve();
        },
        complete: resolve,
      });
    });

    expect(caught).toBeInstanceOf(GeminiChatError);
    expect((caught as GeminiChatError).code).toBe('quota');
  });

  it('maps an unconfigured API key to the missingKey error code without calling the SDK', async () => {
    let caught: unknown;

    await new Promise<void>((resolve) => {
      service.streamReply(history).subscribe({
        next: () => undefined,
        error: (err: unknown) => {
          caught = err;
          resolve();
        },
        complete: resolve,
      });
    });

    expect(caught).toBeInstanceOf(GeminiChatError);
    expect((caught as GeminiChatError).code).toBe('missingKey');
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `ng test --include='**/gemini-chat.service.spec.ts'`
Expected: FAIL — `gemini-chat.service.ts` does not exist yet (`Cannot find module './gemini-chat.service'`).

- [ ] **Step 6: Create `gemini-chat.service.ts`**

```typescript
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { Observable, type Subscriber } from 'rxjs';

import { environment } from '../../../environments/env';
import { type ChatMessage } from '../store/ai-chat/ai-chat.models';

export type GeminiErrorCode = 'missingKey' | 'network' | 'quota' | 'unknown';

export class GeminiChatError extends Error {
  constructor(readonly code: GeminiErrorCode, message: string) {
    super(message);
    this.name = 'GeminiChatError';
  }
}

interface GeminiClient {
  models: {
    generateContentStream: (request: {
      model: string;
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    }) => Promise<AsyncIterable<{ text?: string }>>;
  };
}

const GEMINI_MODEL = 'gemini-2.5-flash';

@Injectable({ providedIn: 'root' })
export class GeminiChatService {
  private readonly platformId = inject(PLATFORM_ID);
  private client: GeminiClient | null = null;

  streamReply(history: ChatMessage[]): Observable<string> {
    return new Observable<string>((subscriber) => {
      if (!isPlatformBrowser(this.platformId)) {
        subscriber.complete();
        return;
      }

      void this.runStream(history, subscriber);
    });
  }

  private async runStream(
    history: ChatMessage[],
    subscriber: Subscriber<string>
  ): Promise<void> {
    try {
      const client = this.getClient();
      const contents = history.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

      const stream = await client.models.generateContentStream({
        model: GEMINI_MODEL,
        contents,
      });

      let accumulated = '';

      for await (const chunk of stream) {
        accumulated += chunk.text ?? '';
        subscriber.next(accumulated);
      }

      subscriber.complete();
    } catch (err) {
      subscriber.error(this.toGeminiChatError(err));
    }
  }

  private getClient(): GeminiClient {
    if (!environment.geminiApiKey) {
      throw new GeminiChatError('missingKey', 'Gemini API key is not configured.');
    }

    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: environment.geminiApiKey });
    }

    return this.client;
  }

  private toGeminiChatError(err: unknown): GeminiChatError {
    if (err instanceof GeminiChatError) {
      return err;
    }

    const message = err instanceof Error ? err.message : String(err);

    if (/quota|rate.?limit|429/i.test(message)) {
      return new GeminiChatError('quota', message);
    }

    if (/network|fetch|failed to connect/i.test(message)) {
      return new GeminiChatError('network', message);
    }

    return new GeminiChatError('unknown', message);
  }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `ng test --include='**/gemini-chat.service.spec.ts'`
Expected: PASS — 3 specs, 0 failures.

- [ ] **Step 8: Lint the new files**

Run: `ng lint --lint-file-patterns 'src/app/core/services/**/*.ts' 'src/environments/**/*.ts'`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/environments src/app/core/services/gemini-chat.service.ts src/app/core/services/gemini-chat.service.spec.ts
git commit -m "feat: add GeminiChatService wrapping @google/genai streaming"
```

---

## Task 4: `aiChat` translations

**Files:**
- Modify: `public/i18n/generic-app/en.json`
- Modify: `public/i18n/generic-app/bn.json`

**Interfaces:**
- Produces: translation keys `aiChat.toggleOpen`, `aiChat.toggleClose`, `aiChat.panelTitle`, `aiChat.placeholder`, `aiChat.send`, `aiChat.newChat`, `aiChat.retry`, `aiChat.errors.missingKey`, `aiChat.errors.network`, `aiChat.errors.quota`, `aiChat.errors.unknown` — consumed by Task 5's `AiChatWidget` template via the `translate` pipe.

- [ ] **Step 1: Replace the full contents of `public/i18n/generic-app/en.json`**

```json
{
  "language": {
    "label": "Language",
    "selected": "selected"
  },
  "theme": {
    "appearance": "Appearance",
    "system": "System",
    "light": "Light",
    "dark": "Dark"
  },
  "dashboard": {
    "revenue": "Revenue",
    "viewDetails": "View details"
  },
  "aiChat": {
    "toggleOpen": "Open AI chat",
    "toggleClose": "Close AI chat",
    "panelTitle": "AI Assistant",
    "placeholder": "Ask me anything...",
    "send": "Send",
    "newChat": "New chat",
    "retry": "Retry",
    "errors": {
      "missingKey": "AI chat is not configured. Please add a Gemini API key.",
      "network": "Network error. Please check your connection and try again.",
      "quota": "AI chat is temporarily unavailable due to usage limits. Please try again later.",
      "unknown": "Something went wrong. Please try again."
    }
  }
}
```

- [ ] **Step 2: Replace the full contents of `public/i18n/generic-app/bn.json`**

```json
{
  "language": {
    "label": "ভাষা",
    "selected": "নির্বাচিত ভাষা"
  },
  "theme": {
    "appearance": "দেখা",
    "system": "সিস্টেম",
    "light": "হালকা",
    "dark": "অন্ধকার"
  },
  "dashboard": {
    "revenue": "মোট আয়",
    "viewDetails": "বিস্তারিত দেখুন"
  },
  "aiChat": {
    "toggleOpen": "এআই চ্যাট খুলুন",
    "toggleClose": "এআই চ্যাট বন্ধ করুন",
    "panelTitle": "এআই সহকারী",
    "placeholder": "যা চান জিজ্ঞাসা করুন...",
    "send": "পাঠান",
    "newChat": "নতুন চ্যাট",
    "retry": "আবার চেষ্টা করুন",
    "errors": {
      "missingKey": "এআই চ্যাট কনফিগার করা নেই। একটি Gemini API কী যুক্ত করুন।",
      "network": "নেটওয়ার্ক সমস্যা হয়েছে। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
      "quota": "ব্যবহারের সীমা পার হওয়ায় এআই চ্যাট সাময়িকভাবে বন্ধ আছে। পরে আবার চেষ্টা করুন।",
      "unknown": "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।"
    }
  }
}
```

- [ ] **Step 3: Validate both files are well-formed JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/i18n/generic-app/en.json','utf8')); JSON.parse(require('fs').readFileSync('public/i18n/generic-app/bn.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add public/i18n/generic-app/en.json public/i18n/generic-app/bn.json
git commit -m "feat: add aiChat translations (en, bn)"
```

---

## Task 5: `AiChatWidget` component, mounted at the app root

**Files:**
- Create: `src/app/shared/components/ai-chat-widget/ai-chat-widget.ts`
- Create: `src/app/shared/components/ai-chat-widget/ai-chat-widget.html`
- Create: `src/app/shared/components/ai-chat-widget/ai-chat-widget.scss`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`

**Interfaces:**
- Consumes: `AiChatActions`, `selectAiChatMessages`, `selectAiChatStatus`, `selectAiChatError` (Task 1); `GeminiChatService`, `GeminiChatError` (Task 3); translation keys under `aiChat.*` (Task 4).
- Produces: `AiChatWidget` standalone component, selector `app-ai-chat-widget`, mounted in `app.html`.

- [ ] **Step 1: Create `ai-chat-widget.ts`**

```typescript
import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import {
  AiChatActions,
  type ChatMessage,
  selectAiChatError,
  selectAiChatMessages,
  selectAiChatStatus,
} from '@core/store';
import { GeminiChatError, GeminiChatService } from '@core/services/gemini-chat.service';

@Component({
  selector: 'app-ai-chat-widget',
  imports: [FormsModule, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './ai-chat-widget.html',
  styleUrl: './ai-chat-widget.scss',
})
export class AiChatWidget {
  private readonly store = inject(Store);
  private readonly geminiChatService = inject(GeminiChatService);

  readonly isOpen = signal(false);
  readonly draftMessage = signal('');
  readonly streamingText = signal('');

  readonly messages = this.store.selectSignal(selectAiChatMessages);
  readonly status = this.store.selectSignal(selectAiChatStatus);
  readonly error = this.store.selectSignal(selectAiChatError);

  readonly isStreaming = computed(() => this.status() === 'loading');

  togglePanel(): void {
    this.isOpen.update((open) => !open);
  }

  updateDraft(value: string): void {
    this.draftMessage.set(value);
  }

  sendMessage(): void {
    const content = this.draftMessage().trim();

    if (!content || this.isStreaming()) {
      return;
    }

    const message: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content,
      createdAt: Date.now(),
    };

    this.draftMessage.set('');
    this.store.dispatch(AiChatActions.sendMessage({ message }));
    this.runStream();
  }

  retryLastMessage(): void {
    this.store.dispatch(AiChatActions.retryLastMessage());
    this.runStream();
  }

  clearConversation(): void {
    this.store.dispatch(AiChatActions.clearConversation());
    this.streamingText.set('');
  }

  private runStream(): void {
    this.streamingText.set('');

    this.geminiChatService.streamReply(this.messages()).subscribe({
      next: (accumulatedText) => this.streamingText.set(accumulatedText),
      error: (err: unknown) => {
        this.streamingText.set('');
        this.store.dispatch(
          AiChatActions.receiveMessageFailure({ error: this.mapErrorToCode(err) })
        );
      },
      complete: () => {
        const finalText = this.streamingText();
        this.streamingText.set('');

        if (finalText) {
          this.store.dispatch(
            AiChatActions.receiveMessageSuccess({
              message: {
                id: this.generateId(),
                role: 'assistant',
                content: finalText,
                createdAt: Date.now(),
              },
            })
          );
        }
      },
    });
  }

  private mapErrorToCode(err: unknown): string {
    return err instanceof GeminiChatError ? err.code : 'unknown';
  }

  private generateId(): string {
    return crypto.randomUUID();
  }
}
```

- [ ] **Step 2: Create `ai-chat-widget.html`**

```html
<div class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
  @if (isOpen()) {
    <div
      class="flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_18px_48px_rgba(2,6,23,0.24)]"
    >
      <header class="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
        <h2 class="text-sm font-semibold text-[var(--color-on-surface)]">{{ 'aiChat.panelTitle' | translate }}</h2>
        <div class="flex items-center gap-1">
          <button mat-icon-button type="button" [attr.aria-label]="'aiChat.newChat' | translate" (click)="clearConversation()">
            <mat-icon class="text-base">refresh</mat-icon>
          </button>
          <button mat-icon-button type="button" [attr.aria-label]="'aiChat.toggleClose' | translate" (click)="togglePanel()">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>
      </header>

      <div class="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        @for (message of messages(); track message.id) {
          <div
            class="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
            [class.ml-auto]="message.role === 'user'"
            [class.bg-[var(--color-primary)]]="message.role === 'user'"
            [class.text-white]="message.role === 'user'"
            [class.bg-[var(--color-gray-light)]]="message.role === 'assistant'"
            [class.text-[var(--color-on-surface)]]="message.role === 'assistant'"
          >
            {{ message.content }}
          </div>
        }

        @if (isStreaming() && streamingText()) {
          <div class="max-w-[85%] rounded-2xl bg-[var(--color-gray-light)] px-3 py-2 text-sm text-[var(--color-on-surface)]">
            {{ streamingText() }}
          </div>
        }

        @if (error()) {
          <div class="flex flex-col items-start gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--color-error)_14%,transparent)] px-3 py-2 text-sm text-[var(--color-error)]">
            <span>{{ 'aiChat.errors.' + error() | translate }}</span>
            <button mat-button type="button" (click)="retryLastMessage()">{{ 'aiChat.retry' | translate }}</button>
          </div>
        }
      </div>

      <form class="flex items-center gap-2 border-t border-[var(--color-border)] px-3 py-3" (ngSubmit)="sendMessage()">
        <input
          type="text"
          class="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
          [ngModel]="draftMessage()"
          (ngModelChange)="updateDraft($event)"
          name="draftMessage"
          [attr.placeholder]="'aiChat.placeholder' | translate"
          [disabled]="isStreaming()"
        />
        <button
          mat-icon-button
          type="submit"
          [attr.aria-label]="'aiChat.send' | translate"
          [disabled]="isStreaming() || !draftMessage().trim()"
        >
          <mat-icon>send</mat-icon>
        </button>
      </form>
    </div>
  }

  <button
    mat-fab
    type="button"
    [attr.aria-label]="(isOpen() ? 'aiChat.toggleClose' : 'aiChat.toggleOpen') | translate"
    class="!bg-[var(--color-primary)] !text-white"
    (click)="togglePanel()"
  >
    <mat-icon>{{ isOpen() ? 'close' : 'chat' }}</mat-icon>
  </button>
</div>
```

- [ ] **Step 3: Create `ai-chat-widget.scss`**

```scss
:host {
	display: contents;
}
```

- [ ] **Step 4: Mount the widget — replace the full contents of `src/app/app.ts`**

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiChatWidget } from './shared/components/ai-chat-widget/ai-chat-widget';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AiChatWidget],
  templateUrl: './app.html',
})
export class App {}
```

- [ ] **Step 5: Replace the full contents of `src/app/app.html`**

```html
<router-outlet />
<app-ai-chat-widget />
```

- [ ] **Step 6: Lint the new component**

Run: `ng lint --lint-file-patterns 'src/app/shared/components/ai-chat-widget/**/*.ts' 'src/app/shared/components/ai-chat-widget/**/*.html' 'src/app/app.ts'`
Expected: no errors.

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`, open `http://localhost:4200/`.

Confirm:
- A floating chat button appears bottom-right on the home page, and still appears after navigating to `/dashboard`.
- Clicking it opens the panel; typing a message and pressing Enter (or the send button) shows the message, then a streamed reply once `geminiApiKey` is set in `src/environments/env.dev.ts` — or, with an empty key, an inline "AI chat is not configured..." error with a working "Retry" button.
- "New chat" clears the conversation.
- Reloading the page after sending a message restores the prior conversation (persisted via `localStorage`).
- Switching language (via the existing language switcher) translates the panel title/placeholder/buttons; switching theme keeps the panel readable in both light and dark mode.

- [ ] **Step 8: Commit**

```bash
git add src/app/shared/components/ai-chat-widget src/app/app.ts src/app/app.html
git commit -m "feat: add floating AiChatWidget mounted at the app root"
```
