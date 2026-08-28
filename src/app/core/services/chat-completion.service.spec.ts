import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { type ChatMessage } from '../store/ai-chat/ai-chat.models';
import { ChatCompletionService } from './chat-completion.service';
import { GeminiChatService } from './gemini-chat.service';
import { OpenAiChatService } from './openai-chat.service';

describe('ChatCompletionService', () => {
  let service: ChatCompletionService;
  let geminiStreamReply: jasmine.Spy;
  let openAiStreamReply: jasmine.Spy;

  const history: ChatMessage[] = [{ id: '1', role: 'user', content: 'Hello', createdAt: 1 }];

  beforeEach(() => {
    geminiStreamReply = jasmine.createSpy('geminiStreamReply').and.returnValue(of('from gemini'));
    openAiStreamReply = jasmine.createSpy('openAiStreamReply').and.returnValue(of('from openai'));

    TestBed.configureTestingModule({
      providers: [
        { provide: GeminiChatService, useValue: { streamReply: geminiStreamReply } },
        { provide: OpenAiChatService, useValue: { streamReply: openAiStreamReply } },
      ],
    });

    service = TestBed.inject(ChatCompletionService);
  });

  function firstEmission(modelId: string): Promise<string> {
    return new Promise((resolve) => {
      service.streamReply(history, modelId).subscribe((value) => resolve(value));
    });
  }

  it('routes a Gemini model to the Gemini service', async () => {
    await expectAsync(firstEmission('gemini-3.6-flash')).toBeResolvedTo('from gemini');

    expect(geminiStreamReply).toHaveBeenCalledWith(history, 'gemini-3.6-flash');
    expect(openAiStreamReply).not.toHaveBeenCalled();
  });

  it('routes an OpenAI model to the OpenAI service', async () => {
    await expectAsync(firstEmission('gpt-5-mini')).toBeResolvedTo('from openai');

    expect(openAiStreamReply).toHaveBeenCalledWith(history, 'gpt-5-mini');
    expect(geminiStreamReply).not.toHaveBeenCalled();
  });

  it('falls back to the default model when the id is unknown', async () => {
    await firstEmission('retired-model');

    expect(geminiStreamReply).toHaveBeenCalledWith(history, 'gemini-3.6-flash');
  });
});
