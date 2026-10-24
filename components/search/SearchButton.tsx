'use client';
// The header's search control (spec 08 FR-18, A-6). The static HTML has a link to /search/, so search works
// without JavaScript; once the page runs it becomes a button that opens the overlay. The overlay's code,
// and Fuse.js with it, loads on the first press (FR-19, FR-37).

import { useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { SrT } from '@/components/T';
import { SEARCH_HREF } from '@/lib/nav';
import type { SearchDistrict } from '@/lib/search';
import { SearchIcon } from './SearchIcon';

const SearchOverlay = dynamic(() => import('./SearchOverlay'), { ssr: false });
const noop = () => () => {};

export function SearchButton({ districts, className }: { districts: readonly SearchDistrict[]; className: string }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  if (!hydrated) {
    return <Link prefetch={false} href={SEARCH_HREF} className={className}><SearchIcon /><SrT k="nav.search" /></Link>;
  }
  return (
    <>
      <button ref={button} type="button" aria-haspopup="dialog" aria-expanded={open} data-search-open className={className}
        onClick={() => { setUsed(true); setOpen(true); }}>
        <SearchIcon /><SrT k="nav.search" />
      </button>
      {used ? <SearchOverlay open={open} districts={districts} onClose={() => { setOpen(false); button.current?.focus(); }} /> : null}
    </>
  );
}
