import { describe, expect, it } from 'vitest';
import { bnDigits, both, formatCoords, formatCount, formatDate, formatHours, formatId, formatMoney } from '@/lib/format';

describe('formatters (task 3.2)', () => {
  it('formatCount groups thousands, with Bangla digits in Bangla', () => {
    expect(both(formatCount, 1136)).toEqual({ en: '1,136', bn: '১,১৩৬' });
    expect(both(formatCount, 0)).toEqual({ en: '0', bn: '০' });
    expect(both(formatCount, 1234567)).toEqual({ en: '1,234,567', bn: '১,২৩৪,৫৬৭' });
    expect(() => formatCount(2.5, 'en')).toThrow();
    expect(() => formatCount(-1, 'en')).toThrow();
  });

  it('formatMoney shows a real price and refuses 0, negatives and non-numbers (R6)', () => {
    expect(both(formatMoney, 30)).toEqual({ en: 'Tk 30', bn: '৩০ টাকা' });
    expect(both(formatMoney, 1500)).toEqual({ en: 'Tk 1,500', bn: '১,৫০০ টাকা' });
    expect(formatMoney(12.5, 'en')).toBe('Tk 12.5');
    for (const bad of [0, -5, NaN, Infinity]) expect(() => formatMoney(bad, 'en'), String(bad)).toThrow();
  });

  it('formatHours', () => {
    expect(both(formatHours, 2.5)).toEqual({ en: '2.5 h', bn: '২.৫ ঘণ্টা' });
    expect(both(formatHours, 3)).toEqual({ en: '3 h', bn: '৩ ঘণ্টা' });
    expect(() => formatHours(NaN, 'en')).toThrow();
  });

  it('formatDate at day, month and year precision', () => {
    expect(both(formatDate, '2026-10-21')).toEqual({ en: '21 October 2026', bn: '২১ অক্টোবর ২০২৬' });
    expect(both(formatDate, '2024-02')).toEqual({ en: 'February 2024', bn: 'ফেব্রুয়ারি ২০২৪' });
    expect(both(formatDate, '1890')).toEqual({ en: '1890', bn: '১৮৯০' });
    expect(formatDate('2024-02-29', 'en')).toBe('29 February 2024');
    for (const bad of ['2026-13-01', '2026-02-30', '2025-02-29', '21/10/2026', '', 'about 1890']) expect(() => formatDate(bad, 'en'), bad).toThrow();
  });

  it('formatId and formatCoords always keep Latin digits', () => {
    expect(formatId('JB-DHK-064')).toBe('JB-DHK-064');
    expect(() => formatId('JB DHK')).toThrow();
    expect(formatCoords(23.91234, 90.12345)).toBe('23.91234° N, 90.12345° E');
    expect(formatCoords(23.91234, 90.12345)).not.toMatch(/[০-৯]/);
    expect(() => formatCoords(NaN, 90)).toThrow();
  });

  it('bnDigits maps every digit', () => {
    expect(bnDigits('0123456789')).toBe('০১২৩৪৫৬৭৮৯');
  });
});
