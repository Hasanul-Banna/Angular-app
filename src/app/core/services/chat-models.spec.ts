import { CHAT_MODELS, DEFAULT_CHAT_MODEL_ID, resolveChatModel } from './chat-models';

describe('chat model registry', () => {
  it('offers the Gemini default alongside the two OpenAI models', () => {
    expect(CHAT_MODELS.map((model) => model.id)).toEqual(['gemini-3.6-flash', 'gpt-5.1', 'gpt-5-mini']);
  });

  it('defaults to the Gemini model', () => {
    expect(DEFAULT_CHAT_MODEL_ID).toBe('gemini-3.6-flash');
  });

  it('resolves a known model id to its provider entry', () => {
    expect(resolveChatModel('gpt-5-mini').provider).toBe('openai');
  });

  it('falls back to the default model for an unknown id', () => {
    expect(resolveChatModel('made-up-model').id).toBe(DEFAULT_CHAT_MODEL_ID);
  });
});
