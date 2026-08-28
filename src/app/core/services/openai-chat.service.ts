import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, type Subscriber } from 'rxjs';

import { environment } from '../../../environments/env';
import { type ChatMessage } from '../store/ai-chat/ai-chat.models';
import { ChatError, toChatError } from './chat-error';

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

/** Sentinel the API sends to close a stream. */
const SSE_DONE = '[DONE]';

interface OpenAiStreamChunk {
  choices?: { delta?: { content?: string } }[];
}

/**
 * Streams OpenAI chat completions over `fetch` + SSE rather than the `openai` package: the widget
 * sits in the app-root bundle, where a second SDK would repeat the budget problem that forced the
 * Gemini SDK behind a dynamic import (see specs/ai-chat-widget.md §6.3).
 */
@Injectable({ providedIn: 'root' })
export class OpenAiChatService {
  private readonly platformId = inject(PLATFORM_ID);

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
      const apiKey = this.getApiKey();

      if (!apiKey) {
        throw new ChatError('missingKey', 'OpenAI API key is not configured.');
      }

      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new ChatError(
          response.status === 429 ? 'quota' : 'unknown',
          `OpenAI request failed with status ${response.status}.`
        );
      }

      await this.emitStream(response, subscriber);
      subscriber.complete();
    } catch (err) {
      subscriber.error(toChatError(err));
    }
  }

  private async emitStream(response: Response, subscriber: Subscriber<string>): Promise<void> {
    const reader = response.body?.getReader();

    if (!reader) {
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';

    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line; a partial trailing event stays buffered.
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        const delta = this.readDelta(event);

        if (delta) {
          accumulated += delta;
          subscriber.next(accumulated);
        }
      }
    }
  }

  private readDelta(event: string): string {
    for (const line of event.split('\n')) {
      if (!line.startsWith('data:')) {
        continue;
      }

      const payload = line.slice('data:'.length).trim();

      if (!payload || payload === SSE_DONE) {
        continue;
      }

      try {
        const chunk = JSON.parse(payload) as OpenAiStreamChunk;

        return chunk.choices?.[0]?.delta?.content ?? '';
      } catch {
        // A malformed event is skipped rather than failing the whole reply.
        return '';
      }
    }

    return '';
  }

  private getApiKey(): string {
    return environment.openaiApiKey;
  }
}
