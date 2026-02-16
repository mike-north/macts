import { describe, it, expect } from 'vitest';
import { VERSION } from './index.js';

describe('@macts/core', () => {
  describe('VERSION', () => {
    it('should export VERSION constant', () => {
      expect(VERSION).toBe('0.0.0');
    });

    it('should be a string', () => {
      expect(typeof VERSION).toBe('string');
    });
  });
});
