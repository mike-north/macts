import { describe, it, expect } from 'vitest';
import { findAppBundle, SdefExtractError, extractSdef } from './extractor.js';

describe('findAppBundle', () => {
  it('should find Calendar app', async () => {
    const path = await findAppBundle('Calendar');
    expect(path).toMatch(/Calendar\.app$/);
  });

  it('should find app with .app suffix', async () => {
    const path = await findAppBundle('Calendar.app');
    expect(path).toMatch(/Calendar\.app$/);
  });

  it('should throw for non-existent app', async () => {
    await expect(findAppBundle('NonExistentApp12345')).rejects.toThrow(SdefExtractError);
  });
});

describe('extractSdef', () => {
  it('should extract SDEF from Calendar', async () => {
    const result = await extractSdef('Calendar');

    expect(result.sdefPath).toMatch(/\.sdef$/);
    expect(result.sdefContent).toContain('<?xml');
    expect(result.sdefContent).toContain('<dictionary');
    expect(result.appPath).toMatch(/Calendar\.app$/);
    expect(result.bundleId).toBe('com.apple.iCal');
  });

  it('should extract SDEF from Finder', async () => {
    const result = await extractSdef('Finder');

    expect(result.sdefContent).toContain('dictionary');
    expect(result.bundleId).toBe('com.apple.finder');
  });
});
