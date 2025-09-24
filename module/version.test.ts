import { describe, expect, it } from 'vitest';

import { Version } from './version';

describe('Version', () => {
  it('should set public properties correctly after construction', () => {
    // Test basic version string
    const version1 = new Version('1.2.3');
    expect(version1.full).toBe('1.2.3');
    expect(version1.major).toBe('1');
    expect(version1.minor).toBe('2');
    expect(version1.patch).toBe('3');

    // Test version with additional patch components
    const version2 = new Version('2.5.7-beta.1');
    expect(version2.full).toBe('2.5.7-beta.1');
    expect(version2.major).toBe('2');
    expect(version2.minor).toBe('5');
    expect(version2.patch).toBe('7-beta.1');

    // Test version with multiple patch components
    const version3 = new Version('10.15.20.alpha.2.build.123');
    expect(version3.full).toBe('10.15.20.alpha.2.build.123');
    expect(version3.major).toBe('10');
    expect(version3.minor).toBe('15');
    expect(version3.patch).toBe('20.alpha.2.build.123');

    // Test single digit versions
    const version4 = new Version('0.0.1');
    expect(version4.full).toBe('0.0.1');
    expect(version4.major).toBe('0');
    expect(version4.minor).toBe('0');
    expect(version4.patch).toBe('1');

    // Test the placeholder version used in the module
    const version5 = new Version('0.0.0-PLACEHOLDER');
    expect(version5.full).toBe('0.0.0-PLACEHOLDER');
    expect(version5.major).toBe('0');
    expect(version5.minor).toBe('0');
    expect(version5.patch).toBe('0-PLACEHOLDER');
  });

  it('should handle edge cases with version strings', () => {
    // Test version with only major and minor (no patch)
    const version1 = new Version('1.2');
    expect(version1.full).toBe('1.2');
    expect(version1.major).toBe('1');
    expect(version1.minor).toBe('2');
    expect(version1.patch).toBe('');

    // Test version with only major
    const version2 = new Version('5');
    expect(version2.full).toBe('5');
    expect(version2.major).toBe('5');
    expect(version2.minor).toBe(undefined);
    expect(version2.patch).toBe('');

    // Test empty string (edge case)
    const version3 = new Version('');
    expect(version3.full).toBe('');
    expect(version3.major).toBe('');
    expect(version3.minor).toBe(undefined);
    expect(version3.patch).toBe('');
  });

  it('should ensure properties exist and are accessible', () => {
    const version = new Version('1.2.3');

    // Verify all public properties are accessible
    expect(version).toHaveProperty('full');
    expect(version).toHaveProperty('major');
    expect(version).toHaveProperty('minor');
    expect(version).toHaveProperty('patch');

    // Verify properties have the correct types
    expect(typeof version.full).toBe('string');
    expect(typeof version.major).toBe('string');
    expect(typeof version.minor).toBe('string');
    expect(typeof version.patch).toBe('string');
  });
});
