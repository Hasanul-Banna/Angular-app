/** Which upstream API a chat model is served by. */
export type ChatProvider = 'gemini' | 'openai';

export interface ChatModelOption {
  /** Stable id used in the store, persisted in `localStorage`, and shown in the picker. */
  id: string;
  provider: ChatProvider;
  /** Model name sent to the provider's API. */
  model: string;
  /** Translation key for the label shown in the model picker. */
  labelKey: string;
}

/**
 * Single source of truth for the model picker and for provider dispatch — adding a model here
 * is enough for it to appear in the widget and route to the right service.
 */
const GEMINI_FLASH: ChatModelOption = {
  id: 'gemini-3.6-flash',
  provider: 'gemini',
  model: 'gemini-3.6-flash',
  labelKey: 'aiChat.models.geminiFlash',
};

export const CHAT_MODELS: readonly ChatModelOption[] = [
  GEMINI_FLASH,
  {
    id: 'gpt-5.1',
    provider: 'openai',
    model: 'gpt-5.1',
    labelKey: 'aiChat.models.gpt51',
  },
  {
    id: 'gpt-5-mini',
    provider: 'openai',
    model: 'gpt-5-mini',
    labelKey: 'aiChat.models.gpt5Mini',
  },
];

export const DEFAULT_CHAT_MODEL_ID = GEMINI_FLASH.id;

export function isChatModelId(value: unknown): value is string {
  return typeof value === 'string' && CHAT_MODELS.some((model) => model.id === value);
}

/** Resolves a stored/selected id, falling back to the default for anything unrecognized. */
export function resolveChatModel(id: string): ChatModelOption {
  return CHAT_MODELS.find((model) => model.id === id) ?? GEMINI_FLASH;
}
