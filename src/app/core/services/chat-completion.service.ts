import { Injectable, inject } from '@angular/core';
import { type Observable } from 'rxjs';

import { type ChatMessage } from '../store/ai-chat/ai-chat.models';
import { resolveChatModel } from './chat-models';
import { GeminiChatService } from './gemini-chat.service';
import { OpenAiChatService } from './openai-chat.service';

/**
 * Single entry point the widget streams through: it turns the selected model id into a provider
 * call, so the component never learns which API is behind the current model.
 */
@Injectable({ providedIn: 'root' })
export class ChatCompletionService {
  private readonly geminiChatService = inject(GeminiChatService);
  private readonly openAiChatService = inject(OpenAiChatService);

  /** Emits the accumulated reply text so far, exactly like each provider service does. */
  streamReply(history: ChatMessage[], modelId: string): Observable<string> {
    const option = resolveChatModel(modelId);

    return option.provider === 'openai'
      ? this.openAiChatService.streamReply(history, option.model)
      : this.geminiChatService.streamReply(history, option.model);
  }
}
