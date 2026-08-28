import { TestBed } from '@angular/core/testing';

import { type ChatMessage } from '../store/ai-chat/ai-chat.models';
import { ChatError } from './chat-error';
import { OpenAiChatService } from './openai-chat.service';

const MODEL = 'gpt-5-mini';

describe('OpenAiChatService', () => {
  let service: OpenAiChatService;

  const history: ChatMessage[] = [{ id: '1', role: 'user', content: 'Hello', createdAt: 1 }];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenAiChatService);
  });

  function withApiKey(key: string): void {
    (service as unknown as { getApiKey: () => string }).getApiKey = () => key;
  }

  /** Builds a `Response` whose body is a Server-Sent Events stream of the given lines. */
  function sseResponse(events: string[]): Response {
    const encoder = new TextEncoder();

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(body, { status: 200 });
  }

  function deltaEvent(text: string): string {
    return JSON.stringify({ choices: [{ delta: { content: text } }] });
  }

  function collect(model = MODEL): Promise<{ emissions: string[]; error: unknown }> {
    return new Promise((resolve) => {
      const emissions: string[] = [];

      service.streamReply(history, model).subscribe({
        next: (value) => emissions.push(value),
        error: (error: unknown) => resolve({ emissions, error }),
        complete: () => resolve({ emissions, error: null }),
      });
    });
  }

  it('emits accumulated text for each streamed chunk', async () => {
    withApiKey('test-key');
    spyOn(window, 'fetch').and.resolveTo(sseResponse([deltaEvent('Hi'), deltaEvent(' there'), '[DONE]']));

    const { emissions, error } = await collect();

    expect(error).toBeNull();
    expect(emissions).toEqual(['Hi', 'Hi there']);
  });

  it('sends the requested model and the conversation history', async () => {
    withApiKey('test-key');
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(sseResponse(['[DONE]']));

    await collect('gpt-5.1');

    const requestBody = fetchSpy.calls.mostRecent().args[1]?.body as string;
    const body: unknown = JSON.parse(requestBody);

    expect(body).toEqual({
      model: 'gpt-5.1',
      stream: true,
      messages: [{ role: 'user', content: 'Hello' }],
    });
  });

  it('maps an unconfigured API key to the missingKey error code without calling the API', async () => {
    withApiKey('');
    const fetchSpy = spyOn(window, 'fetch');

    const { error } = await collect();

    expect(error).toBeInstanceOf(ChatError);
    expect((error as ChatError).code).toBe('missingKey');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps a 429 response to the quota error code', async () => {
    withApiKey('test-key');
    spyOn(window, 'fetch').and.resolveTo(new Response('rate limited', { status: 429 }));

    const { error } = await collect();

    expect((error as ChatError).code).toBe('quota');
  });

  it('maps a failed request to the network error code', async () => {
    withApiKey('test-key');
    spyOn(window, 'fetch').and.rejectWith(new TypeError('Failed to fetch'));

    const { error } = await collect();

    expect((error as ChatError).code).toBe('network');
  });
});
