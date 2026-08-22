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
      contents: { role: string; parts: { text: string }[] }[];
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

    this.client ??= new GoogleGenAI({ apiKey: environment.geminiApiKey });

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
