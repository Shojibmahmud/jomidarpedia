// A small Markdown subset for content/about.en.md (spec 10 FR-35), rendered at build time with no client
// JavaScript and no dependency. Blocks: `## Heading {#anchor}` starts a section, `### Heading`, paragraphs,
// `- ` lists and `::name` directives (a component the page supplies). Inline: **bold**, *italic* and
// [text](url). Anything else is plain text, so a typo shows up on the page rather than vanishing.

import Link from 'next/link';
import type { ReactNode } from 'react';

export type Block = { kind: 'p' | 'h3'; text: string } | { kind: 'ul'; items: string[] } | { kind: 'directive'; name: string };
export interface Section { id: string; title: string; blocks: Block[] }
export interface Doc { lead: Block[]; sections: Section[] }

export function parseMarkdown(body: string): Doc {
  const doc: Doc = { lead: [], sections: [] };
  let blocks = doc.lead;
  let para: string[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join(' ') });
    if (list) blocks.push({ kind: 'ul', items: list });
    para = [];
    list = null;
  };
  for (const raw of body.split('\n')) {
    const line = raw.trimEnd();
    const h2 = /^## (.+?)\s*\{#([a-z0-9-]+)\}$/.exec(line);
    if (h2) {
      flush();
      const section: Section = { id: h2[2], title: h2[1], blocks: [] };
      doc.sections.push(section);
      blocks = section.blocks;
      continue;
    }
    if (/^## /.test(line)) throw new Error(`markdown: a section heading needs an anchor, as in "## Title {#anchor}": ${line}`);
    if (!line.trim()) { flush(); continue; }
    const h3 = /^### (.+)$/.exec(line);
    const directive = /^::([a-z-]+)$/.exec(line);
    const item = /^- (.+)$/.exec(line);
    if (h3 || directive) {
      flush();
      blocks.push(h3 ? { kind: 'h3', text: h3[1] } : { kind: 'directive', name: directive![1] });
    } else if (item) {
      if (para.length) flush();
      (list ??= []).push(item[1]);
    } else if (list) {
      list[list.length - 1] += ` ${line.trim()}`; // a wrapped list item
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return doc;
}

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > at) out.push(text.slice(at, m.index));
    const key = out.length;
    if (m[1] !== undefined) out.push(<strong key={key}>{inline(m[1])}</strong>);
    else if (m[2] !== undefined) out.push(<em key={key}>{inline(m[2])}</em>);
    else {
      const [label, href] = [m[3], m[4]];
      out.push(href.startsWith('/')
        ? <Link key={key} prefetch={false} href={href} className="font-semibold text-primary underline">{inline(label)}</Link>
        : <a key={key} href={href} rel="noopener" className="font-semibold text-primary underline">{inline(label)}</a>);
    }
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/** `listIcon`, when given, leads every list item (a section's own marker, such as "not done yet"). */
export function Blocks({ blocks, directives = {}, listIcon }: { blocks: Block[]; directives?: Record<string, ReactNode>; listIcon?: ReactNode }) {
  return blocks.map((b, k) => {
    switch (b.kind) {
      case 'p': return <p key={k}>{inline(b.text)}</p>;
      case 'h3': return <h3 key={k} className="font-serif text-h3">{inline(b.text)}</h3>;
      case 'ul': return (
        <ul key={k} className="space-y-2">
          {b.items.map((it, i) => (
            <li key={i} className={listIcon ? 'flex gap-3 rounded-lg border border-line bg-surface p-3' : 'rounded-lg border border-line bg-surface p-3'}>
              {listIcon ? <><span aria-hidden="true" className="mt-0.5 shrink-0 text-muted">{listIcon}</span><span>{inline(it)}</span></> : inline(it)}
            </li>
          ))}
        </ul>
      );
      case 'directive': {
        if (!(b.name in directives)) throw new Error(`markdown: unknown directive ::${b.name}`);
        return <div key={k}>{directives[b.name]}</div>;
      }
    }
  });
}
