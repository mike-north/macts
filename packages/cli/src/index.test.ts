import { describe, it, expect } from 'vitest'
import { VERSION } from './index.js'

describe('@macts/cli', () => {
  describe('VERSION re-export', () => {
    it('should re-export VERSION from @macts/core', () => {
      expect(VERSION).toBe('0.0.0')
    })

    it('should be a string', () => {
      expect(typeof VERSION).toBe('string')
    })
  })
})
