import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { type ChatMessage } from './ai-chat.models';

export const AiChatActions = createActionGroup({
  source: 'AI Chat',
  events: {
    'Send Message': props<{ message: ChatMessage }>(),
    'Retry Last Message': emptyProps(),
    'Receive Message Success': props<{ message: ChatMessage }>(),
    'Receive Message Failure': props<{ error: string }>(),
    'Clear Conversation': emptyProps(),
  },
});
