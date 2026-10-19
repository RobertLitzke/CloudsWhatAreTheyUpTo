import { describe, expect, it } from 'vitest';
import { licenseId, plainText } from '../tools/photos/commons';
import { isLicenseId } from '../src/core/photos';

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
