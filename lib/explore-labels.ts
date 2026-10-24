// Labels for Explore's filter options, active-filter chips and the empty-state suggestion (spec 06
// FR-17 to FR-23, FR-27), in both languages. Numbers in labels are formatted, never typed (lib/i18n.ts).

import { both, formatCount } from './format';
import { dual, type Dual, type StringKey } from './i18n';
import type { ActiveValue, FilterState, Group, Places } from './filters';
import type { TravelBucket } from './types';

const n = (v: number) => both(formatCount, v);

export function bucketLabel(b: TravelBucket | 'any'): Dual {
  if (b === 'any') return dual('tt.any');
  if (b === 'unknown') return dual('tt.unknown');
  if (b === '4+') return dual('tt.over', { hours: n(4) });
  const [from, to] = b.split('-').map(Number);
  return dual('tt.range', { from: n(from), to: n(to) });
}

export const GROUP_LABEL: Record<Group, StringKey> = {
  day: 'filter.day', tt: 'filter.tt', cond: 'filter.cond', acc: 'filter.acc', where: 'filter.where', type: 'filter.type',
  doc: 'filter.doc', vloc: 'filter.vloc', photo: 'filter.photo', hours: 'filter.hours',
};

const divisionName = (p: Places, slug: string): Dual => {
  const d = p.list.divisions.find(x => x.slug === slug);
  return d ? { en: d.en, bn: d.bn } : { en: slug, bn: slug };
};
const districtName = (p: Places, slug: string): Dual => {
  const d = p.list.districts.find(x => x.slug === slug);
  return d ? { en: d.en, bn: d.bn } : { en: slug, bn: slug };
};

export function valueLabel(v: ActiveValue, p: Places): Dual {
  switch (v.group) {
    case 'tt': return bucketLabel(v.value);
    case 'cond': return dual(`filter.cond.${v.value}`);
    case 'acc': return dual(`filter.acc.${v.value}`);
    case 'type': return dual(`filter.type.${v.value}`);
    case 'div': return divisionName(p, v.value);
    case 'dist': return districtName(p, v.value);
    default: return dual(GROUP_LABEL[v.group]);
  }
}

const join = (parts: Dual[]): Dual => ({ en: parts.map(x => x.en).join(', '), bn: parts.map(x => x.bn).join(', ') });

/** A whole group as one phrase: "Condition: Lost, Preserved", or the switch's own label. */
export function groupPhrase(g: Group, f: FilterState, p: Places): Dual {
  const name = dual(GROUP_LABEL[g]);
  const values: Dual[] =
    g === 'tt' ? [bucketLabel(f.tt)]
      : g === 'cond' ? f.cond.map(c => dual(`filter.cond.${c}`))
        : g === 'acc' ? f.acc.map(a => dual(`filter.acc.${a}`))
          : g === 'type' ? f.type.map(t => dual(`filter.type.${t}`))
            : g === 'where' ? [...f.div.map(d => divisionName(p, d)), ...f.dist.map(d => districtName(p, d))]
              : [];
  if (!values.length) return name;
  const v = join(values);
  return { en: `${name.en}: ${v.en}`, bn: `${name.bn}: ${v.bn}` };
}
