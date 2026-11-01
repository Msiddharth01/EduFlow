'use client';

import React, { useState } from 'react';
import { Copy, Check, FileText, ChevronRight } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`prose-academic space-y-4 text-sm leading-relaxed text-slate-700 dark:text-gray-300 ${className}`}>
      {blocks.map((block, index) => (
        <BlockComponent key={index} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'p'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; code: string; language: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'hr' };

function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code', code: codeLines.join('\n'), language });
      continue;
    }

    // Horizontal Rule
    if (/^(\-{3,}|\_{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'h4', text: trimmed.slice(5).trim() });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [trimmed.slice(2).trim()];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2).trim());
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    // Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && /\|[\s\-:]+\|/.test(lines[i + 1])) {
      const headers = trimmed
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowCells = lines[i]
          .trim()
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        rows.push(rowCells);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Unordered List
    if (/^[\*\-\•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[\*\-\•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[\*\-\•]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph
    const paraLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('|') &&
      !/^[\*\-\•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'p', text: paraLines.join(' ') });
  }

  return blocks;
}

function BlockComponent({ block }: { block: Block }) {
  switch (block.type) {
    case 'h1':
      return (
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white pt-4 pb-2 border-b border-slate-200 dark:border-gray-800 tracking-tight flex items-center gap-2">
          <span className="w-2 h-6 bg-indigo-600 rounded-full inline-block flex-shrink-0" />
          <InlineContent text={block.text} />
        </h1>
      );
    case 'h2':
      return (
        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-gray-100 pt-3 pb-1.5 border-b border-slate-200/80 dark:border-gray-800/60 tracking-tight">
          <InlineContent text={block.text} />
        </h2>
      );
    case 'h3':
      return (
        <h3 className="text-sm sm:text-base font-semibold text-indigo-700 dark:text-indigo-400 pt-2">
          <InlineContent text={block.text} />
        </h3>
      );
    case 'h4':
      return (
        <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-gray-400 pt-1">
          <InlineContent text={block.text} />
        </h4>
      );
    case 'p':
      return (
        <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
          <InlineContent text={block.text} />
        </p>
      );
    case 'blockquote':
      return (
        <div className="p-3.5 my-2 border-l-4 border-indigo-500 bg-slate-50 dark:bg-indigo-950/20 border border-slate-200/60 dark:border-indigo-900/30 rounded-r-lg text-xs sm:text-sm text-slate-800 dark:text-gray-200 italic shadow-sm">
          <InlineContent text={block.text} />
        </div>
      );
    case 'code':
      return <CodeBlock code={block.code} language={block.language} />;
    case 'ul':
      return (
        <ul className="space-y-1.5 my-2 pl-1">
          {block.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
              <span className="text-indigo-600 dark:text-indigo-400 mt-1 flex-shrink-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
              <div className="flex-1">
                <InlineContent text={item} />
              </div>
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="space-y-2 my-2 pl-1">
          {block.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
              <span className="w-5 h-5 flex-shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center mt-0.5 border border-indigo-200/60 dark:border-indigo-800/40">
                {idx + 1}
              </span>
              <div className="flex-1">
                <InlineContent text={item} />
              </div>
            </li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div className="overflow-x-auto my-3 border border-slate-200 dark:border-gray-800 rounded-xl shadow-sm bg-white dark:bg-[#0c1322]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-[#11192e] border-b border-slate-200 dark:border-gray-800 text-slate-900 dark:text-gray-200 font-bold">
                {block.headers.map((h, i) => (
                  <th key={i} className="py-2.5 px-3.5 whitespace-nowrap">
                    <InlineContent text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
              {block.rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-gray-900/30 transition-colors">
                  {r.map((cell, j) => (
                    <td key={j} className="py-2.5 px-3.5 text-slate-700 dark:text-gray-300">
                      <InlineContent text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'hr':
      return <hr className="my-4 border-slate-200 dark:border-gray-800" />;
    default:
      return null;
  }
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-800 bg-slate-900 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950 border-b border-slate-800 text-xs text-slate-400 font-mono">
        <span className="uppercase font-semibold tracking-wider text-[10px] text-indigo-400">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-[11px] cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-emerald-300/90 whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function InlineContent({ text }: { text: string }) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // 1. Page references: "(Page 4)" or "Page 4" or "Pages 2–19"
    const pageMatch = remaining.match(/^(?:(?:\((Pages?\s+\d+(?:[–\-]\d+)?)\))|(Pages?\s+\d+(?:[–\-]\d+)?))/i);
    if (pageMatch) {
      const matchText = pageMatch[0];
      const pageLabel = pageMatch[1] || pageMatch[2];
      parts.push(
        <span
          key={keyIndex++}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200/70 dark:border-indigo-800/40"
        >
          <FileText className="w-3 h-3 flex-shrink-0" />
          <span>{pageLabel}</span>
        </span>
      );
      remaining = remaining.slice(matchText.length);
      continue;
    }

    // 2. Bold & Italic: ***text***
    const boldItalicMatch = remaining.match(/^\*\*\*([^*]+)\*\*\*/);
    if (boldItalicMatch) {
      parts.push(
        <strong key={keyIndex++} className="font-bold italic text-slate-900 dark:text-white">
          {boldItalicMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldItalicMatch[0].length);
      continue;
    }

    // 3. Bold: **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(
        <strong key={keyIndex++} className="font-bold text-slate-900 dark:text-white">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 4. Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*([^*]+)\*|_([^_]+)_)/);
    if (italicMatch) {
      const itText = italicMatch[2] || italicMatch[3];
      parts.push(
        <em key={keyIndex++} className="italic text-slate-800 dark:text-gray-200">
          {itText}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 5. Inline Code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code
          key={keyIndex++}
          className="px-1.5 py-0.5 rounded font-mono text-xs bg-slate-100 dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-gray-700"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 6. Regular text slice up to next token
    const nextSpecial = remaining.search(/[\*\_\`\(]|(?:Pages?\s+\d+)/i);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return <>{parts}</>;
}
