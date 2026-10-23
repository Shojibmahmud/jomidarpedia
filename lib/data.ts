// Typed readers for the generated data (roadmap task 3.10). Build time only: they read data/build/**
// and public/data/index.json with fs while pages are pre-rendered. `server-only` makes importing this
// file from a client component a build error. Shapes: lib/types.ts; fields: docs/DATA_CONTRACT.md.
// A missing file throws a message that names it; an unknown ID throws instead of returning undefined.

import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Credit, District, Division, IndexSite, Itinerary, Meta, SiteRecord, SourceEntry, TripSummary } from './types';

export function createReaders(buildDir = join(process.cwd(), 'data/build'), indexPath = join(process.cwd(), 'public/data/index.json')) {
  const cache = new Map<string, unknown>();
  const read = <T>(path: string, what: string): T => {
    if (!cache.has(path)) {
      if (!existsSync(path)) throw new Error(`${what} not found at ${path}. Run \`npm run data\` first.`);
      cache.set(path, JSON.parse(readFileSync(path, 'utf8')));
    }
    return cache.get(path) as T;
  };
  const file = <T>(name: string) => () => read<T>(join(buildDir, name), `data/build/${name}`);

  const getIndex = () => read<IndexSite[]>(indexPath, 'public/data/index.json');
  const getTrips = file<TripSummary[]>('trips.json');
  const ids = (list: { id?: string; i?: string }[]) => new Set(list.map(x => x.id ?? x.i));

  return {
    getIndex,
    getMeta: file<Meta>('meta.json'),
    getDivisions: file<Division[]>('divisions.json'),
    getDistricts: file<District[]>('districts.json'),
    getSources: file<SourceEntry[]>('sources.json'),
    getCredits: file<Credit[]>('credits.json'),
    getTrips,
    getSite(id: string): SiteRecord {
      if (!ids(getIndex()).has(id)) throw new Error(`getSite: no site "${id}" in the index`);
      return read<SiteRecord>(join(buildDir, 'sites', `${id}.json`), `data/build/sites/${id}.json`);
    },
    getTrip(id: string): Itinerary {
      if (!ids(getTrips()).has(id)) throw new Error(`getTrip: no trip "${id}" in trips.json`);
      return read<Itinerary>(join(buildDir, 'trips', `${id}.json`), `data/build/trips/${id}.json`);
    },
  };
}

export const { getIndex, getMeta, getDivisions, getDistricts, getSources, getCredits, getTrips, getSite, getTrip } = createReaders();
