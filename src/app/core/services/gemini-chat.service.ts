import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, type Subscriber } from 'rxjs';

import { environment } from '../../../environments/env';
import { type ChatMessage } from '../store/ai-chat/ai-chat.models';
import { ChatError, toChatError } from './chat-error';

interface GeminiClient {
  models: {
    generateContentStream: (request: {
      model: string;
      contents: { role: string; parts: { text: string }[] }[];
    }) => Promise<AsyncIterable<{ text?: string }>>;
  };
}

@Injectable({ providedIn: 'root' })
export class GeminiChatService {
  private readonly platformId = inject(PLATFORM_ID);
  private client: GeminiClient | null = null;

  streamReply(history: ChatMessage[], model: string): Observable<string> {
    return new Observable<string>((subscriber) => {
      if (!isPlatformBrowser(this.platformId)) {
        subscriber.complete();
        return;
      }

      void this.runStream(history, model, subscriber);
    });
  }

  private async runStream(
    history: ChatMessage[],
    model: string,
    subscriber: Subscriber<string>
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const contents = history.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

      const stream = await client.models.generateContentStream({
        model,
        contents,
      });

      let accumulated = '';

      for await (const chunk of stream) {
        accumulated += chunk.text ?? '';
        subscriber.next(accumulated);
      }

      subscriber.complete();
    } catch (err) {
      subscriber.error(toChatError(err));
    }
  }

  private async getClient(): Promise<GeminiClient> {
    if (!environment.geminiApiKey) {
      throw new ChatError('missingKey', 'Gemini API key is not configured.');
    }

    if (!this.client) {
      const { GoogleGenAI } = await import('@google/genai');
      this.client = new GoogleGenAI({ apiKey: environment.geminiApiKey });
    }

    return this.client;
  }
}
