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
import { type Subscription } from 'rxjs';
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

  private streamSubscription: Subscription | null = null;

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
    this.streamSubscription?.unsubscribe();
    this.streamSubscription = null;
    this.store.dispatch(AiChatActions.clearConversation());
    this.streamingText.set('');
  }

  private runStream(): void {
    this.streamingText.set('');

    this.streamSubscription?.unsubscribe();
    this.streamSubscription = this.geminiChatService.streamReply(this.messages()).subscribe({
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
        } else {
          this.store.dispatch(AiChatActions.receiveMessageFailure({ error: 'unknown' }));
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
