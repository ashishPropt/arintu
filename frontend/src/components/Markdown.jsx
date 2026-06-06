/**
 * Minimal markdown renderer for blog posts. Supports:
 *   # H1 / ## H2 / ### H3
 *   **bold**, *italic* / _italic_, `code`
 *   [text](url)
 *   > blockquote (multi-line)
 *   - or * unordered list
 *   1. ordered list
 *   --- horizontal rule
 *   paragraphs separated by blank lines
 *   plain URLs auto-linked
 */
import { Fragment } from 'react';

// Escape HTML to keep things safe
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Inline transforms applied to a single line of text
function inline(text) {
  let s = esc(text);
  // Auto-link bare URLs (must run before bold/italic to avoid colliding)
  s = s.replace(/(\bhttps?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:underline">$1</a>');
  // Auto-link bare emails
  s = s.replace(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, '<a href="mailto:$1" class="text-brand-600 hover:underline">$1</a>');
  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:underline">$1</a>');
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  // Italic — single _ or *
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_\w])_([^_\n]+)_(?=[^_\w]|$)/g, '$1<em>$2</em>');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-sm font-mono">$1</code>');
  return s;
}

export default function Markdown({ source = '' }) {
  if (!source) return null;
  const lines = source.replace(/\r\n/g, '\n').split('\n');

  const blocks = [];
  let para = [];          // current paragraph lines
  let quote = [];         // current blockquote lines
  let list = null;        // { type: 'ul'|'ol', items: [string[]] }

  const flushPara = () => {
    if (para.length === 0) return;
    blocks.push(<p key={blocks.length} className="my-4 leading-relaxed text-gray-700"
      dangerouslySetInnerHTML={{ __html: inline(para.join(' ')) }} />);
    para = [];
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    blocks.push(
      <blockquote key={blocks.length}
        className="my-6 px-5 py-3 border-l-4 border-brand-300 bg-brand-50 italic text-brand-900 rounded-r-lg leading-relaxed">
        {quote.map((line, i) => (
          <Fragment key={i}>
            <span dangerouslySetInnerHTML={{ __html: inline(line) }} />
            {i < quote.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </blockquote>
    );
    quote = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.type;
    blocks.push(
      <Tag key={blocks.length} className={`my-4 pl-6 space-y-1 ${list.type === 'ul' ? 'list-disc' : 'list-decimal'}`}>
        {list.items.map((it, i) => (
          <li key={i} className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inline(it) }} />
        ))}
      </Tag>
    );
    list = null;
  };
  const flushAll = () => { flushPara(); flushQuote(); flushList(); };

  for (let raw of lines) {
    const line = raw.replace(/\s+$/, '');

    if (line === '') { flushAll(); continue; }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      flushAll();
      blocks.push(<hr key={blocks.length} className="my-8 border-gray-200" />);
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flushAll();
      const level = h[1].length;
      const text = h[2];
      const cls = level === 1
        ? 'mt-8 mb-3 text-2xl font-bold text-gray-900'
        : level === 2
        ? 'mt-7 mb-2 text-xl font-bold text-gray-900'
        : 'mt-6 mb-2 text-base font-semibold text-gray-900';
      const Tag = `h${level}`;
      blocks.push(<Tag key={blocks.length} className={cls}
        dangerouslySetInnerHTML={{ __html: inline(text) }} />);
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      flushPara(); flushList();
      quote.push(line.replace(/^>\s?/, ''));
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      flushPara(); flushQuote();
      if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
      list.items.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      flushPara(); flushQuote();
      if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
      list.items.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    // Regular paragraph line — collapse blockquote/list if active
    flushQuote(); flushList();
    para.push(line);
  }
  flushAll();

  return <div className="prose-arintu">{blocks}</div>;
}
