import { describe, expect, it } from 'vitest';
import el from '../../messages/el.json';
import en from '../../messages/en.json';

type Json = Record<string, unknown>;

function flatten(obj: Json, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatten(v as Json, key));
    } else {
      out.push(key);
    }
  }
  return out.sort();
}

describe('i18n parity', () => {
  const elKeys = flatten(el as Json);
  const enKeys = flatten(en as Json);

  it('Greek and English message files cover the same keys', () => {
    const onlyInEl = elKeys.filter((k) => !enKeys.includes(k));
    const onlyInEn = enKeys.filter((k) => !elKeys.includes(k));
    expect({ onlyInEl, onlyInEn }).toEqual({ onlyInEl: [], onlyInEn: [] });
  });

  it('every key resolves to a non-empty string', () => {
    const missing: string[] = [];
    for (const locale of [el, en] as const) {
      for (const key of flatten(locale as Json)) {
        const value = key.split('.').reduce<unknown>((acc, p) => {
          if (acc && typeof acc === 'object') return (acc as Json)[p];
          return undefined;
        }, locale);
        if (typeof value !== 'string' || value.trim() === '') missing.push(key);
      }
    }
    expect(missing).toEqual([]);
  });
});
