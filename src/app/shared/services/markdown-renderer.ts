/**
 * A deliberately small Markdown → HTML renderer for AI chat replies.
 *
 * Why hand-rolled instead of a library: the widget lives in the app-root bundle (see
 * `specs/ai-chat-widget.md` §6.3 for the bundle-budget history), and the output needs to
 * carry our own `md-*` class hooks so it can be themed with the design tokens.
 *
 * Safety model: every character of the source is HTML-escaped **before** any parsing
 * happens, and the only unescaped markup in the result is the fixed tag set this file
 * writes itself. Nothing from the model's text can therefore become markup, which is why
 * the pipe is allowed to `bypassSecurityTrustHtml` the result.
 *
 * Supported: ATX headings, fenced/indented-free code blocks, unordered + ordered lists
 * (nested, with `- [ ]` task items), blockquotes, GFM pipe tables, thematic breaks,
 * paragraphs, and the inline set (code, links, autolinks, bold, italic, strikethrough).
 * Not supported: reference links, footnotes, inline HTML, setext headings.
 */

/** Sentinel wrapper for inline fragments that must not be re-processed by later passes. */
const PLACEHOLDER = (index: number): string => `\uE000md${index}\uE000`;
const PLACEHOLDER_PATTERN = /\uE000md(\d+)\uE000/g;

/** Only these schemes are ever emitted into an `href`. */
const SAFE_URL_PATTERN = /^(?:https?:\/\/|mailto:)/i;

const FENCE_OPEN = /^\s*(?:```|~~~)\s*([\w+#.-]*)\s*$/;
const FENCE_CLOSE = /^\s*(?:```|~~~)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const THEMATIC_BREAK = /^\s*([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const BLOCKQUOTE = /^\s*>\s?/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TASK_ITEM = /^\[([ xX])\]\s+/;
const TABLE_DELIMITER = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

interface ListItemNode {
  indent: number;
  ordered: boolean;
  text: string;
}

type ColumnAlignment = 'left' | 'center' | 'right';

export interface MarkdownOptions {
  /**
   * Accessible label for the per-code-block copy button. It is passed in rather than
   * resolved here so this file stays free of Angular and i18n dependencies; leave it out
   * and no copy button is rendered.
   */
  copyCodeLabel?: string;
}

export function renderMarkdown(markdown: string, options: MarkdownOptions = {}): string {
  // Strip the sentinel out of the source so a reply can never forge a placeholder.
  const source = (markdown ?? '').replace(/\uE000/g, '').replace(/\r\n?/g, '\n');

  return renderBlocks(source.split('\n'), options);
}

function renderBlocks(lines: string[], options: MarkdownOptions): string {
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = FENCE_OPEN.exec(line);
    if (fence) {
      const code: string[] = [];
      index += 1;

      while (index < lines.length && !FENCE_CLOSE.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }

      // A missing closing fence is normal mid-stream — render what has arrived so far.
      index += 1;
      html.push(renderCodeBlock(code.join('\n'), fence[1], options));
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      // The panel already owns an <h2> title, so `#` starts at <h3> to keep the
      // document outline ordered rather than restarting at <h1> inside a bubble.
      const level = Math.min(heading[1].length + 2, 6);
      html.push(`<h${level} class="md-heading">${renderInline(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (THEMATIC_BREAK.test(line)) {
      html.push('<hr class="md-hr" />');
      index += 1;
      continue;
    }

    if (BLOCKQUOTE.test(line)) {
      const quoted: string[] = [];

      while (index < lines.length && (BLOCKQUOTE.test(lines[index]) || lines[index].trim())) {
        if (!BLOCKQUOTE.test(lines[index]) && isBlockStart(lines[index])) {
          break;
        }

        quoted.push(lines[index].replace(BLOCKQUOTE, ''));
        index += 1;
      }

      html.push(`<blockquote class="md-quote">${renderBlocks(quoted, options)}</blockquote>`);
      continue;
    }

    if (isTableStart(lines, index)) {
      const table = consumeTable(lines, index);
      html.push(table.html);
      index = table.next;
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const list = consumeList(lines, index);
      html.push(list.html);
      index = list.next;
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    html.push(`<p class="md-p">${paragraph.map(renderInline).join('<br />')}</p>`);
  }

  return html.join('');
}

function isBlockStart(line: string): boolean {
  return FENCE_OPEN.test(line) || HEADING.test(line) || THEMATIC_BREAK.test(line) || BLOCKQUOTE.test(line) || LIST_ITEM.test(line);
}

function renderCodeBlock(code: string, language: string, options: MarkdownOptions): string {
  const label = language ? escapeHtml(language) : '';
  const copyLabel = options.copyCodeLabel ? escapeHtml(options.copyCodeLabel) : '';

  // The copy button is plain markup — the widget catches its clicks by delegation, since
  // nothing inside `[innerHTML]` can carry an Angular binding.
  const toolbar =
    label || copyLabel
      ? '<div class="md-codeblock__bar">' +
        `<span class="md-codeblock__lang">${label}</span>` +
        (copyLabel
          ? `<button type="button" class="md-copy" title="${copyLabel}" aria-label="${copyLabel}">` +
            '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/>' +
            '</svg>' +
            '</button>'
          : '') +
        '</div>'
      : '';

  return '<div class="md-codeblock">' + toolbar + `<pre class="md-pre"><code>${escapeHtml(code)}</code></pre>` + '</div>';
}

function consumeList(lines: string[], start: number): { html: string; next: number } {
  const items: ListItemNode[] = [];
  let index = start;

  while (index < lines.length) {
    const match = LIST_ITEM.exec(lines[index]);

    if (match) {
      items.push({
        indent: match[1].replace(/\t/g, '  ').length,
        ordered: /\d/.test(match[2]),
        text: match[3],
      });
      index += 1;
      continue;
    }

    // A wrapped continuation line belongs to the item above it.
    if (items.length && lines[index].trim() && !isBlockStart(lines[index])) {
      items[items.length - 1].text += ` ${lines[index].trim()}`;
      index += 1;
      continue;
    }

    break;
  }

  return { html: buildList(items, { index: 0 }, items[0].indent), next: index };
}

function buildList(items: ListItemNode[], cursor: { index: number }, indent: number): string {
  const ordered = items[cursor.index].ordered;
  const entries: string[] = [];

  while (cursor.index < items.length && items[cursor.index].indent >= indent) {
    const item = items[cursor.index];

    if (item.indent > indent) {
      const nested = buildList(items, cursor, item.indent);

      if (entries.length) {
        // Re-open the previous <li> so the nested list renders inside it.
        entries[entries.length - 1] = entries[entries.length - 1].replace(/<\/li>$/, `${nested}</li>`);
      } else {
        entries.push(`<li class="md-li">${nested}</li>`);
      }

      continue;
    }

    entries.push(buildListItem(item.text));
    cursor.index += 1;
  }

  const tag = ordered ? 'ol' : 'ul';

  return `<${tag} class="md-list">${entries.join('')}</${tag}>`;
}

function buildListItem(text: string): string {
  const task = TASK_ITEM.exec(text);

  if (!task) {
    return `<li class="md-li">${renderInline(text)}</li>`;
  }

  const checked = task[1].toLowerCase() === 'x';

  return (
    `<li class="md-li md-li--task${checked ? ' md-li--done' : ''}">` +
    `<input type="checkbox" class="md-task-box" disabled${checked ? ' checked' : ''} />` +
    `<span>${renderInline(text.slice(task[0].length))}</span>` +
    '</li>'
  );
}

function isTableStart(lines: string[], index: number): boolean {
  return lines[index].includes('|') && index + 1 < lines.length && lines[index + 1].includes('-') && TABLE_DELIMITER.test(lines[index + 1]);
}

function consumeTable(lines: string[], start: number): { html: string; next: number } {
  const headers = splitTableRow(lines[start]);
  const alignments = splitTableRow(lines[start + 1]).map(toAlignment);
  const body: string[][] = [];
  let index = start + 2;

  while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
    body.push(splitTableRow(lines[index]));
    index += 1;
  }

  const headCells = headers.map((cell, column) => `<th class="md-th"${alignStyle(alignments[column])}>${renderInline(cell)}</th>`).join('');

  const bodyRows = body
    .map((row) => {
      const cells = headers.map((_header, column) => `<td class="md-td"${alignStyle(alignments[column])}>${renderInline(row[column] ?? '')}</td>`).join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return {
    html: '<div class="md-table-wrap"><table class="md-table">' + `<thead><tr>${headCells}</tr></thead>` + `<tbody>${bodyRows}</tbody>` + '</table></div>',
    next: index,
  };
}

function splitTableRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function toAlignment(delimiter: string): ColumnAlignment {
  const left = delimiter.startsWith(':');
  const right = delimiter.endsWith(':');

  if (left && right) {
    return 'center';
  }

  return right ? 'right' : 'left';
}

function alignStyle(alignment: ColumnAlignment | undefined): string {
  return alignment && alignment !== 'left' ? ` style="text-align:${alignment}"` : '';
}

function renderInline(raw: string): string {
  const held: string[] = [];
  const hold = (fragment: string): string => {
    held.push(fragment);
    return PLACEHOLDER(held.length - 1);
  };

  let text = escapeHtml(raw);

  // Code spans are parked first so their contents never pick up emphasis markup.
  text = text.replace(/`([^`]+)`/g, (_match, code: string) => hold(`<code class="md-code">${code}</code>`));

  text = text.replace(/\[([^\]\n]*)\]\(([^()\s]+)\)/g, (match, label: string, href: string) => (SAFE_URL_PATTERN.test(href) ? hold(anchor(href, label || href)) : match));

  text = text.replace(/(^|[\s(])(https?:\/\/[^\s<]*[^\s<.,;:!?)\]])/g, (_match, lead: string, url: string) => lead + hold(anchor(url, url)));

  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^\w_])_([^_\n]+)_(?![\w_])/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return text.replace(PLACEHOLDER_PATTERN, (_match, index: string) => held[Number(index)]);
}

function anchor(href: string, label: string): string {
  return `<a class="md-link" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
