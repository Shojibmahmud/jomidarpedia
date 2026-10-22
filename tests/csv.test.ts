import { describe, expect, it } from 'vitest';
import { parseCsv, LINE } from '../scripts/csv.mjs';

describe('parseCsv', () => {
  it('keeps a comma inside a quoted field', () => {
    expect(parseCsv('id,name\n1,"Baliati, Saturia"\n')).toEqual({ rows: [{ id: '1', name: 'Baliati, Saturia' }], errors: [] });
  });

  it('unescapes a doubled quote', () => {
    expect(parseCsv('id,note\n1,"the ""Pink Palace"""\n').rows).toEqual([{ id: '1', note: 'the "Pink Palace"' }]);
  });

  it('reads a Bangla value unchanged', () => {
    expect(parseCsv('id,name_bn\n1,বালিয়াটি জমিদার বাড়ি\n').rows).toEqual([{ id: '1', name_bn: 'বালিয়াটি জমিদার বাড়ি' }]);
  });

  it('strips a byte-order mark from the first header', () => {
    const [row] = parseCsv('﻿site_id,name\nJB-DHK-064,Baliati\n').rows;
    expect(Object.keys(row)).toEqual(['site_id', 'name']);
  });

  it('reads CRLF line endings', () => {
    expect(parseCsv('id,name\r\n1,a\r\n2,b\r\n')).toEqual({ rows: [{ id: '1', name: 'a' }, { id: '2', name: 'b' }], errors: [] });
  });

  it('keeps a newline inside a quoted field and numbers rows by the line they start on', () => {
    const { rows, errors } = parseCsv('id,note\n1,"two\nlines"\n2,x\n');
    expect(errors).toEqual([]);
    expect(rows.map(r => [r.note, (r as unknown as Record<symbol, number>)[LINE]])).toEqual([['two\nlines', 2], ['x', 4]]);
  });

  it('ignores blank lines', () => {
    expect(parseCsv('id,name\n1,a\n\n2,b\n\n').errors).toEqual([]);
  });

  it('reports a row with the wrong number of fields', () => {
    expect(parseCsv('id,name\n1,a\n2,b,extra\n3\n').errors).toEqual([
      { line: 3, message: 'has 3 fields; the header has 2' },
      { line: 4, message: 'has 1 fields; the header has 2' }
    ]);
  });

  it('reports a row of separators only', () => {
    expect(parseCsv('a,b,c\n,,,\n').errors).toEqual([{ line: 2, message: 'has 4 fields; the header has 3' }]);
  });

  it('reports a quote that is never closed', () => {
    expect(parseCsv('id,name\n1,"open\n2,b\n').errors).toContainEqual({ line: 2, message: 'quote opened here is never closed' });
  });

  it('reports duplicate and empty header names', () => {
    expect(parseCsv('id,name,name,\n1,a,b,c\n').errors).toEqual([
      { line: 1, column: 'name', message: 'header "name" appears more than once' },
      { line: 1, message: 'header 4 is empty' }
    ]);
  });
});
