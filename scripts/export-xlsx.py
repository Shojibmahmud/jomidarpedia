#!/usr/bin/env python3
"""Export the data sheets of jomidar-bari-database2.xlsx to data/csv/<lower_snake>.csv.

No dependencies (openpyxl not required): the workbook uses inline strings, so the
sheet XML is parsed with zipfile + regex. Cells are placed by their column reference
(r="B12") so empty cells never shift columns.

Usage: python3 scripts/export-xlsx.py <workbook.xlsx> <out-dir>
"""
import csv, html, re, sys, zipfile
from pathlib import Path

SHEETS = ['Sites', 'History_Events', 'Legends', 'Visitor_Info', 'Travel_Routes', 'Itineraries',
          'Itinerary_Stops', 'Costs', 'Images', 'Sources', 'Site_Sources', 'Claims',
          'Claim_Source_Links', 'Site_Relationships']

ROW = re.compile(r'<row\b[^>]*?(?:/>|>(.*?)</row>)', re.S)
CELL = re.compile(r'<c\b([^>]*?)(?:/>|>(.*?)</c>)', re.S)
ATTR = re.compile(r'(\w+)="([^"]*)"')
TEXT = re.compile(r'<t\b[^>]*?(?:/>|>(.*?)</t>)', re.S)
VAL = re.compile(r'<v>(.*?)</v>', re.S)


def col_index(ref):
    letters = re.match(r'[A-Z]+', ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


def cell_value(attrs, body):
    t = attrs.get('t', 'n')
    if body is None:
        return ''
    if t == 'inlineStr':
        return html.unescape(''.join(m or '' for m in TEXT.findall(body)))
    v = VAL.search(body)
    v = html.unescape(v.group(1)) if v else ''
    if t == 'b':
        return 'TRUE' if v == '1' else 'FALSE' if v == '0' else v
    if t == 's':
        raise SystemExit('shared strings not supported')
    if t == 'n' and v:
        # Excel shows 15 significant digits; this also drops float noise (90.09577400000001) and '.0'.
        return '%.15g' % float(v) if re.search(r'[.eE]', v) else v
    return v


def read_sheet(xml):
    rows = []
    for m in ROW.finditer(xml):
        body = m.group(1) or ''
        cells = {}
        for c in CELL.finditer(body):
            attrs = dict(ATTR.findall(c.group(1)))
            cells[col_index(attrs['r'])] = cell_value(attrs, c.group(2))
        rows.append(cells)
    return rows


def main(xlsx, out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    z = zipfile.ZipFile(xlsx)
    wb = z.read('xl/workbook.xml').decode()
    rels = z.read('xl/_rels/workbook.xml.rels').decode()
    rid_target = {a['Id']: a['Target'] for a in (dict(ATTR.findall(r)) for r in re.findall(r'<Relationship\b([^>]*)/>', rels))}
    sheets = {}
    for s in re.findall(r'<sheet\b([^>]*)/>', wb):
        a = dict(re.findall(r'([\w:]+)="([^"]*)"', s))
        sheets[a['name']] = rid_target[a['r:id']].lstrip('/')
    for name in SHEETS:
        xml = z.read(sheets[name]).decode('utf-8')
        rows = read_sheet(xml)
        while rows and not any(v != '' for v in rows[-1].values()):
            rows.pop()
        width = len(rows[0])
        header = [rows[0].get(i, '') for i in range(width)]
        assert all(header), f'{name}: blank header cell'
        extra = [r for r in rows if r and max(r) >= width and any(r[k] for k in r if k >= width)]
        assert not extra, f'{name}: {len(extra)} rows have values past the header'
        dim = re.search(r'<dimension ref="[A-Z]+\d+:[A-Z]+(\d+)"', xml)
        path = out / f'{name.lower()}.csv'
        with open(path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f, lineterminator='\n')
            for r in rows:
                w.writerow([r.get(i, '') for i in range(width)])
        print(f'{name:20} {len(rows) - 1:6} rows  {width:3} cols  (sheet dimension: {int(dim.group(1)) - 1 if dim else "?"} data rows)  -> {path.name}')


if __name__ == '__main__':
    main(*sys.argv[1:3])
