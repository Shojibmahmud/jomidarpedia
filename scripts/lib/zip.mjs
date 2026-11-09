// A minimal zip writer and reader on node:zlib (spec 16 A-1, NFR-2): no dependency. The writer sorts the entries
// and stamps every one with the same date, so the same files give the same bytes on the same Node version.
// Only what the data export needs: deflate or stored entries, UTF-8 names, no zip64 (files under 4 GB).

import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;
const UTF8 = 0x0800;

/** A DOS date for YYYY-MM-DD (time 00:00). */
export function dosDate(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate ?? '');
  if (!m) throw new Error(`zip: "${isoDate}" is not a YYYY-MM-DD date`);
  return ((Number(m[1]) - 1980) << 9) | (Number(m[2]) << 5) | Number(m[3]);
}

/**
 * @param {{ name: string, data: Buffer | string }[]} files
 * @param {{ date: string }} options the entries' date (YYYY-MM-DD)
 */
export function writeZip(files, { date }) {
  const day = dosDate(date);
  const names = new Set();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    if (names.has(f.name)) throw new Error(`zip: "${f.name}" is listed twice`);
    names.add(f.name);
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const stored = packed.length >= data.length;
    const body = stored ? data : packed;
    const name = Buffer.from(f.name, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8, 6);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8, 8);
    central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END, 0);
  end.writeUInt16LE(names.size, 8);
  end.writeUInt16LE(names.size, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

/** The entries of a zip as { name, data }, in stored order. Reads the central directory; checks each CRC. */
export function readZip(buf) {
  const endAt = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endAt < 0) throw new Error('zip: no end-of-directory record');
  const count = buf.readUInt16LE(endAt + 10);
  let p = buf.readUInt32LE(endAt + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== CENTRAL) throw new Error('zip: broken central directory');
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const at = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = at + 30 + buf.readUInt16LE(at + 26) + buf.readUInt16LE(at + 28);
    const body = buf.subarray(start, start + size);
    const data = method === 0 ? Buffer.from(body) : method === 8 ? inflateRawSync(body) : null;
    if (!data) throw new Error(`zip: ${name} uses unsupported method ${method}`);
    if (crc32(data) !== crc) throw new Error(`zip: ${name} fails its CRC check`);
    entries.push({ name, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
