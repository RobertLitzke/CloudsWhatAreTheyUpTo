import { describe, expect, it } from 'vitest';
import { licenseId, plainText } from '../tools/photos/commons';
import { CATEGORIES } from '../tools/photos/config';
import { isLicenseId, problems, SUBJECTS, type Photo } from '../src/core/photos';
import library from '../src/data/photos.json';

describe('the photo library', () => {
  it('credits every photo under an accepted licence', () => {
    for (const p of library as Partial<Photo>[]) expect(problems(p), p.id).toEqual([]);
  });

  it('has somewhere to look for every subject', () => {
    expect(Object.keys(CATEGORIES).sort()).toEqual(Object.keys(SUBJECTS).sort());
  });
});

describe('Commons licences', () => {
  it('maps the accepted licences onto the app ids', () => {
    expect(licenseId('Public domain')).toBe('PD');
    expect(licenseId('CC0')).toBe('CC0');
    expect(licenseId('CC BY 2.0')).toBe('CC-BY-2.0');
    expect(licenseId('CC BY-SA 3.0')).toBe('CC-BY-SA-3.0');
    expect(licenseId('CC BY-SA 4.0')).toBe('CC-BY-SA-4.0');
  });

  it('leaves out NonCommercial, NoDerivatives and the unclear', () => {
    for (const s of ['CC BY-NC 2.0', 'CC BY-ND 4.0', 'CC BY-NC-SA 3.0', 'GFDL', 'CC BY-SA 2.5', '']) expect(licenseId(s)).toBeNull();
  });

  it('only ever produces ids the app knows', () => {
    for (const s of ['Public domain', 'CC0', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0']) expect(isLicenseId(licenseId(s)!)).toBe(true);
  });

  it('strips the author HTML', () => {
    expect(plainText('<a href="//commons.wikimedia.org/wiki/User:X">Jane &amp; Joe</a>')).toBe('Jane & Joe');
  });
});
