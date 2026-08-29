import { renderMarkdown } from './markdown-renderer';

describe('renderMarkdown', () => {
  describe('safety', () => {
    it('escapes HTML so model output can never become markup', () => {
      const html = renderMarkdown('<img src=x onerror="alert(1)"> & "quoted"');

      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;quoted&quot;');
    });

    it('escapes HTML inside code blocks and code spans', () => {
      expect(renderMarkdown('```\n<script>bad()</script>\n```')).toContain('&lt;script&gt;bad()&lt;/script&gt;');
      expect(renderMarkdown('use `<b>` here')).toContain('<code class="md-code">&lt;b&gt;</code>');
    });

    it('refuses to emit non-http(s) link schemes', () => {
      const html = renderMarkdown('[click](javascript:alert(1))');

      expect(html).not.toContain('href');
      expect(html).toContain('[click]');
    });

    it('strips the sentinel so a reply cannot forge a placeholder', () => {
      const sentinel = String.fromCharCode(0xe000);
      const html = renderMarkdown(`${sentinel}md0${sentinel} and \`real\``);

      expect(html).toContain('md0 and');
      expect(html).toContain('<code class="md-code">real</code>');
    });
  });

  describe('blocks', () => {
    it('renders paragraphs, joining wrapped lines with a break', () => {
      expect(renderMarkdown('first\nsecond')).toBe('<p class="md-p">first<br />second</p>');
    });

    it('starts headings at h3 to keep the panel outline ordered', () => {
      expect(renderMarkdown('# Title')).toContain('<h3 class="md-heading">Title</h3>');
      expect(renderMarkdown('### Deep')).toContain('<h5 class="md-heading">Deep</h5>');
    });

    it('renders a fenced code block with its language label', () => {
      const html = renderMarkdown('```ts\nconst a = 1;\n```');

      expect(html).toContain('<span class="md-codeblock__lang">ts</span>');
      expect(html).toContain('<pre class="md-pre"><code>const a = 1;</code></pre>');
    });

    it('only renders the code copy button when a label is supplied', () => {
      expect(renderMarkdown('```\na\n```')).not.toContain('md-copy');
      expect(renderMarkdown('```\na\n```', { copyCodeLabel: 'Copy code' })).toContain('<button type="button" class="md-copy" title="Copy code" aria-label="Copy code">');
    });

    it('renders an unterminated fence so a streaming code block is still visible', () => {
      expect(renderMarkdown('```ts\nconst a =')).toContain('<code>const a =</code>');
    });

    it('renders unordered and ordered lists', () => {
      expect(renderMarkdown('- one\n- two')).toBe('<ul class="md-list"><li class="md-li">one</li><li class="md-li">two</li></ul>');
      expect(renderMarkdown('1. one\n2. two')).toContain('<ol class="md-list">');
    });

    it('nests an indented list inside its parent item', () => {
      const html = renderMarkdown('- outer\n  - inner');

      expect(html).toBe('<ul class="md-list"><li class="md-li">outer' + '<ul class="md-list"><li class="md-li">inner</li></ul></li></ul>');
    });

    it('renders task list items as disabled checkboxes', () => {
      const html = renderMarkdown('- [x] done\n- [ ] todo');

      expect(html).toContain('md-li--done');
      expect(html).toContain('checked');
      expect(html).toContain('<span>todo</span>');
    });

    it('renders blockquotes with their inner blocks', () => {
      expect(renderMarkdown('> quoted **text**')).toBe('<blockquote class="md-quote"><p class="md-p">quoted <strong>text</strong></p></blockquote>');
    });

    it('renders a pipe table with column alignment', () => {
      const html = renderMarkdown('| a | b |\n| --- | ---: |\n| 1 | 2 |');

      expect(html).toContain('<table class="md-table">');
      expect(html).toContain('<th class="md-th">a</th>');
      expect(html).toContain('style="text-align:right"');
      expect(html).toContain('<td class="md-td">1</td>');
    });

    it('renders a thematic break', () => {
      expect(renderMarkdown('---')).toBe('<hr class="md-hr" />');
    });
  });

  describe('inline', () => {
    it('renders bold, italic and strikethrough', () => {
      expect(renderMarkdown('**b** *i* ~~s~~')).toContain('<strong>b</strong> <em>i</em> <del>s</del>');
    });

    it('renders markdown links and bare URLs as safe anchors', () => {
      const link = renderMarkdown('[docs](https://example.com)');
      const bare = renderMarkdown('see https://example.com/a?b=1 now');

      expect(link).toContain('<a class="md-link" href="https://example.com"');
      expect(link).toContain('rel="noopener noreferrer"');
      expect(bare).toContain('href="https://example.com/a?b=1"');
      expect(bare).toContain(' now');
    });

    it('does not apply emphasis inside a code span', () => {
      expect(renderMarkdown('`a * b * c`')).toContain('<code class="md-code">a * b * c</code>');
    });
  });

  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
