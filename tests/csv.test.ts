import { describe, expect, it } from 'vitest';
import { parseCsv } from '../scripts/csv.mjs';

describe('parseCsv', () => {
  it('keeps a comma inside a quoted field', () => {
    expect(parseCsv('id,name\n1,"Baliati, Saturia"\n')).toEqual([{ id: '1', name: 'Baliati, Saturia' }]);
  });

  it('unescapes a doubled quote', () => {
    expect(parseCsv('id,note\n1,"the ""Pink Palace"""\n')).toEqual([{ id: '1', note: 'the "Pink Palace"' }]);
  });

  it('reads a Bangla value unchanged', () => {
    expect(parseCsv('id,name_bn\n1,বালিয়াটি জমিদার বাড়ি\n')).toEqual([{ id: '1', name_bn: 'বালিয়াটি জমিদার বাড়ি' }]);
  });

  it('strips a byte-order mark from the first header', () => {
    const [row] = parseCsv('﻿site_id,name\nJB-DHK-064,Baliati\n');
    expect(Object.keys(row)).toEqual(['site_id', 'name']);
  });

  // Fails today: rows of the wrong length are accepted silently. Becomes a real test in roadmap task 1.3.
  it.todo('reports a row with the wrong number of fields');
});
