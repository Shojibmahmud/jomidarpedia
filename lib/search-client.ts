'use client';
// The browser's copy of index.json and the search matcher, shared by Explore, the header's search overlay
// and /search/ (spec 08 FR-19, FR-36): index.json is fetched at most once per page, and Fuse.js is imported
// only when a search box is used. A failed load is forgotten, so Retry fetches again (NFR-4).

import { useCallback, useEffect, useState } from 'react';
import { createMatcher, type Matcher } from './search';
import type { IndexSite } from './types';

let indexLoad: Promise<IndexSite[]> | undefined;
let matcherLoad: Promise<Matcher> | undefined;

export function loadIndex(): Promise<IndexSite[]> {
  indexLoad ??= fetch('/data/index.json')
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((sites: unknown) => {
      if (!Array.isArray(sites)) throw new Error('index.json is not a list');
      return sites as IndexSite[];
    })
    .catch(e => { indexLoad = undefined; throw e; });
  return indexLoad;
}

export function loadMatcher(): Promise<Matcher> {
  matcherLoad ??= Promise.all([loadIndex(), import('fuse.js')])
    .then(([sites, fuse]) => createMatcher(sites, fuse.default))
    .catch(e => { matcherLoad = undefined; throw e; });
  return matcherLoad;
}

export type Loaded<T> = { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; value: T };

/** Loads something once `enabled` turns true; `retry` after an error loads it again. */
function useLoad<T>(load: () => Promise<T>, enabled: boolean): { state: Loaded<T>; retry: () => void } {
  type Result = { attempt: number } & ({ ok: true; value: T } | { ok: false });
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    load().then(value => { if (live) setResult({ attempt, ok: true, value }); }, () => { if (live) setResult({ attempt, ok: false }); });
    return () => { live = false; };
  }, [load, enabled, attempt]);
  const retry = useCallback(() => setAttempt(a => a + 1), []);
  const state: Loaded<T> = result?.ok ? { status: 'ready', value: result.value }
    : !enabled ? { status: 'idle' }
      : result && result.attempt === attempt ? { status: 'error' } : { status: 'loading' };
  return { state, retry };
}

export const useIndexData = (enabled = true) => useLoad(loadIndex, enabled);
export const useMatcher = (enabled: boolean) => useLoad(loadMatcher, enabled);
