import { TestBed } from '@angular/core/testing';

import { type ChatMessage } from '../store/ai-chat/ai-chat.models';
import { ChatError } from './chat-error';
import { GeminiChatService } from './gemini-chat.service';

interface FakeClient {
  models: { generateContentStream: jasmine.Spy };
}

const MODEL = 'gemini-3.6-flash';

describe('GeminiChatService', () => {
  let service: GeminiChatService;

  const history: ChatMessage[] = [{ id: '1', role: 'user', content: 'Hello', createdAt: 1 }];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeminiChatService);
  });

  function withFakeClient(client: FakeClient): void {
    (service as unknown as { getClient: () => Promise<FakeClient> }).getClient = () => Promise.resolve(client);
  }

  function fakeStreamingClient(chunks: string[]): FakeClient {
    return {
      models: {
        generateContentStream: jasmine.createSpy('generateContentStream').and.resolveTo(
          // eslint-disable-next-line @typescript-eslint/require-await
          (async function* () {
            for (const chunk of chunks) {
              yield { text: chunk };
            }
          })(),
        ),
      },
    };
  }

  it('sends the requested model to the SDK', async () => {
    const client = fakeStreamingClient(['Hi']);
    withFakeClient(client);

    await new Promise<void>((resolve, reject) => {
      service.streamReply(history, 'gemini-3.6-flash').subscribe({
        next: () => undefined,
        error: reject,
        complete: resolve,
      });
    });

    expect(client.models.generateContentStream.calls.mostRecent().args[0].model).toBe('gemini-3.6-flash');
  });

  it('emits accumulated text for each streamed chunk', async () => {
    withFakeClient(fakeStreamingClient(['Hi', ' there']));

    const emissions: string[] = [];

    await new Promise<void>((resolve, reject) => {
      service.streamReply(history, MODEL).subscribe({
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
        generateContentStream: jasmine.createSpy('generateContentStream').and.rejectWith(new Error('429 Too Many Requests: quota exceeded')),
      },
    });

    let caught: unknown;

    await new Promise<void>((resolve) => {
      service.streamReply(history, MODEL).subscribe({
        next: () => undefined,
        error: (err: unknown) => {
          caught = err;
          resolve();
        },
        complete: resolve,
      });
    });

    expect(caught).toBeInstanceOf(ChatError);
    expect((caught as ChatError).code).toBe('quota');
  });

  it('maps an unconfigured API key to the missingKey error code without calling the SDK', async () => {
    let caught: unknown;

    await new Promise<void>((resolve) => {
      service.streamReply(history, MODEL).subscribe({
        next: () => undefined,
        error: (err: unknown) => {
          caught = err;
          resolve();
        },
        complete: resolve,
      });
    });

    expect(caught).toBeInstanceOf(ChatError);
    expect((caught as ChatError).code).toBe('missingKey');
  });
});
