// "Last checked {date}" (roadmap task 5.3, spec 05 FR-17). The server renders the date; StaleNote, a small
// client island, adds "May be out of date" against the visitor's clock, so the warning never goes stale
// between builds. Without JavaScript only the date shows.

import { T } from '@/components/T';
import { both, formatDate } from '@/lib/format';
import { StaleNote } from './StaleNote';

export function LastChecked({ date, className = '' }: { date?: string; className?: string }) {
  if (!date) return <span className={className}><T k="checked.none" /></span>;
  return (
    <span className={className}>
      <T k="checked.on" vars={{ date: both(formatDate, date) }} />
      <StaleNote date={date} />
    </span>
  );
}
