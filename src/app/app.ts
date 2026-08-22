import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiChatWidget } from './shared/components/ai-chat-widget/ai-chat-widget';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AiChatWidget],
  templateUrl: './app.html',
})
export class App {}
