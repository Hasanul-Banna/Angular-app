import { inject, Pipe, type PipeTransform } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { type MarkdownOptions, renderMarkdown } from '../services/markdown-renderer';

/**
 * Renders Markdown to HTML for `[innerHTML]`.
 *
 * The `bypassSecurityTrustHtml` here is safe because `renderMarkdown` escapes the whole
 * source before parsing and only ever emits its own fixed tag set — see the safety note
 * at the top of `markdown-renderer.ts`. Never feed this pipe anything that has already
 * been turned into HTML somewhere else.
 *
 * The pipe is pure, so a streaming reply only re-parses when its text actually changes.
 * `copyCodeLabel` is taken as an argument (rather than resolved inside the renderer) so the
 * caller can pass an already-translated string and purity still tracks language switches.
 */
@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined, copyCodeLabel?: string): SafeHtml {
    const options: MarkdownOptions = copyCodeLabel ? { copyCodeLabel } : {};

    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(value ?? '', options));
  }
}
