import { afterRenderEffect, Component, computed, type ElementRef, inject, signal, untracked, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { type Subscription } from 'rxjs';
import { AiChatActions, type ChatMessage, selectAiChatError, selectAiChatMessages, selectAiChatStatus, selectAppLanguage } from '@core/store';
import { GeminiChatError, GeminiChatService } from '@core/services/gemini-chat.service';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

/** Distance (px) from the bottom within which the conversation is considered "pinned". */
const STICK_TO_BOTTOM_THRESHOLD = 48;

/** Above this jump size a smooth animation is used instead of an instant snap. */
const SMOOTH_SCROLL_THRESHOLD = 240;

/** How long the "copied" confirmation stays on a message. */
const COPIED_FEEDBACK_MS = 1600;

/** Maps an app language onto a BCP-47 tag for `Intl` time formatting. */
const TIME_LOCALES: Record<string, string> = { en: 'en-US', bn: 'bn-BD' };

@Component({
  selector: 'app-ai-chat-widget',
  imports: [FormsModule, MarkdownPipe, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './ai-chat-widget.html',
  styleUrl: './ai-chat-widget.scss',
  // Delegated on the host because the copy buttons inside rendered Markdown are plain DOM
  // and cannot carry a template binding. Clicks elsewhere in the widget fall through.
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(click)': 'onRenderedClick($event)' },
})
export class AiChatWidget {
  private readonly store = inject(Store);
  private readonly geminiChatService = inject(GeminiChatService);
  private readonly clipboard = inject(Clipboard);

  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  private readonly language = this.store.selectSignal(selectAppLanguage);

  /** Id of the message (or `'code'` marker) currently showing the "copied" confirmation. */
  readonly copiedKey = signal<string | null>(null);
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  /** False once the user scrolls up, so streaming never yanks them back down. */
  private readonly stickToBottom = signal(true);

  readonly isOpen = signal(false);
  readonly draftMessage = signal('');
  readonly streamingText = signal('');

  private streamSubscription: Subscription | null = null;

  readonly messages = this.store.selectSignal(selectAiChatMessages);
  readonly status = this.store.selectSignal(selectAiChatStatus);
  readonly error = this.store.selectSignal(selectAiChatError);

  readonly isStreaming = computed(() => this.status() === 'loading');

  constructor() {
    // Follows the conversation as tokens stream in, but only while the user stays pinned
    // to the bottom. Runs after render so the new content is already measurable.
    afterRenderEffect(() => {
      this.isOpen();
      this.messages();
      this.streamingText();
      this.isStreaming();
      this.error();

      if (untracked(this.stickToBottom)) {
        this.scrollToBottom();
      }
    });
  }

  onConversationScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    this.stickToBottom.set(distanceFromBottom <= STICK_TO_BOTTOM_THRESHOLD);
  }

  togglePanel(): void {
    this.stickToBottom.set(true);
    this.isOpen.update((open) => !open);
  }

  copyMessage(message: ChatMessage): void {
    this.copyText(message.content, message.id);
  }

  /**
   * Copy buttons inside a rendered code block live in `[innerHTML]`, so they can't carry an
   * Angular binding — the click is caught here by delegation on the message list instead.
   */
  onRenderedClick(event: Event): void {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>('.md-copy');

    if (!trigger) {
      return;
    }

    const code = trigger.closest('.md-codeblock')?.querySelector('code')?.textContent;

    if (!code || !this.clipboard.copy(code)) {
      return;
    }

    // The button isn't part of the component's template, so its confirmation state is
    // toggled on the element directly rather than through a signal.
    trigger.dataset['copied'] = 'true';
    setTimeout(() => delete trigger.dataset['copied'], COPIED_FEEDBACK_MS);
  }

  /** Local wall-clock time for a message, in the language the app is currently showing. */
  formatTime(createdAt: number): string {
    return new Intl.DateTimeFormat(TIME_LOCALES[this.language()] ?? 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(createdAt));
  }

  private copyText(text: string, key: string): void {
    if (!this.clipboard.copy(text)) {
      return;
    }

    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
    }

    this.copiedKey.set(key);
    this.copiedTimer = setTimeout(() => this.copiedKey.set(null), COPIED_FEEDBACK_MS);
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
    this.stickToBottom.set(true);
    this.store.dispatch(AiChatActions.sendMessage({ message }));
    this.runStream();
  }

  retryLastMessage(): void {
    this.stickToBottom.set(true);
    this.store.dispatch(AiChatActions.retryLastMessage());
    this.runStream();
  }

  clearConversation(): void {
    this.streamSubscription?.unsubscribe();
    this.streamSubscription = null;
    this.store.dispatch(AiChatActions.clearConversation());
    this.streamingText.set('');
    this.stickToBottom.set(true);
  }

  private scrollToBottom(): void {
    const element = this.scrollContainer()?.nativeElement;

    if (!element) {
      return;
    }

    const target = element.scrollHeight - element.clientHeight;
    const delta = target - element.scrollTop;

    if (delta <= 0) {
      return;
    }

    // Streaming appends a few characters at a time, so an instant set already reads as a
    // gradual crawl. Only bigger jumps (a new message, reopening the panel) get animated.
    element.scrollTo({
      top: target,
      behavior: delta > SMOOTH_SCROLL_THRESHOLD ? 'smooth' : 'auto',
    });
  }

  private runStream(): void {
    this.streamingText.set('');

    this.streamSubscription?.unsubscribe();
    this.streamSubscription = this.geminiChatService.streamReply(this.messages()).subscribe({
      next: (accumulatedText) => this.streamingText.set(accumulatedText),
      error: (err: unknown) => {
        this.streamingText.set('');
        this.store.dispatch(AiChatActions.receiveMessageFailure({ error: this.mapErrorToCode(err) }));
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
            }),
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
