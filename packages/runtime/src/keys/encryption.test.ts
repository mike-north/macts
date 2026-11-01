import { describe, it, expect } from 'vitest'
import { deriveEncryptionKey, encrypt, decrypt } from './encryption.js'

describe('encryption', () => {
  const testSecret = 'test-signing-secret-for-encryption'
  const testKey = deriveEncryptionKey(testSecret)

  describe('deriveEncryptionKey', () => {
    it('should derive a 32-byte key', () => {
      const key = deriveEncryptionKey('my-secret')
      expect(key).toBeInstanceOf(Buffer)
      expect(key.length).toBe(32)
    })

    it('should produce consistent output for the same input', () => {
      const key1 = deriveEncryptionKey('same-secret')
      const key2 = deriveEncryptionKey('same-secret')
      expect(key1.equals(key2)).toBe(true)
    })

    it('should produce different keys for different secrets', () => {
      const key1 = deriveEncryptionKey('secret-one')
      const key2 = deriveEncryptionKey('secret-two')
      expect(key1.equals(key2)).toBe(false)
    })

    it('should handle empty string as input', () => {
      const key = deriveEncryptionKey('')
      expect(key.length).toBe(32)
    })

    it('should handle very long secrets', () => {
      const longSecret = 'a'.repeat(10_000)
      const key = deriveEncryptionKey(longSecret)
      expect(key.length).toBe(32)
    })
  })

  describe('encrypt / decrypt roundtrip', () => {
    it('should decrypt back to the original plaintext', () => {
      const plaintext = 'hello, world!'
      const ciphertext = encrypt(plaintext, testKey)
      const decrypted = decrypt(ciphertext, testKey)
      expect(decrypted).toBe(plaintext)
    })

    it('should handle empty string', () => {
      const ciphertext = encrypt('', testKey)
      const decrypted = decrypt(ciphertext, testKey)
      expect(decrypted).toBe('')
    })

    it('should handle unicode characters', () => {
      const plaintext = 'Hello 世界 مرحبا 🌍'
      const ciphertext = encrypt(plaintext, testKey)
      const decrypted = decrypt(ciphertext, testKey)
      expect(decrypted).toBe(plaintext)
    })

    it('should handle JSON arrays (typical permission data)', () => {
      const permissions = JSON.stringify(['calendar:events:list', 'calendar:events:get'])
      const ciphertext = encrypt(permissions, testKey)
      const decrypted = decrypt(ciphertext, testKey)
      expect(JSON.parse(decrypted)).toEqual(['calendar:events:list', 'calendar:events:get'])
    })

    it('should handle large payloads', () => {
      const large = 'x'.repeat(100_000)
      const ciphertext = encrypt(large, testKey)
      const decrypted = decrypt(ciphertext, testKey)
      expect(decrypted).toBe(large)
    })
  })

  describe('encrypt', () => {
    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const plaintext = 'same input each time'
      const c1 = encrypt(plaintext, testKey)
      const c2 = encrypt(plaintext, testKey)
      expect(c1).not.toBe(c2)
    })

    it('should produce a base64-encoded string', () => {
      const ciphertext = encrypt('test', testKey)
      // Should be valid base64 — decoding should not throw
      expect(() => Buffer.from(ciphertext, 'base64')).not.toThrow()
      // Re-encoding should match (no extraneous characters)
      const decoded = Buffer.from(ciphertext, 'base64')
      expect(decoded.toString('base64')).toBe(ciphertext)
    })

    it('should produce output at least 28 bytes (IV + authTag)', () => {
      const ciphertext = encrypt('', testKey)
      const decoded = Buffer.from(ciphertext, 'base64')
      // 12 bytes IV + 16 bytes authTag = 28 minimum
      expect(decoded.length).toBeGreaterThanOrEqual(28)
    })
  })

  describe('decrypt error cases', () => {
    it('should throw for wrong key', () => {
      const ciphertext = encrypt('secret data', testKey)
      const wrongKey = deriveEncryptionKey('wrong-secret')
      expect(() => decrypt(ciphertext, wrongKey)).toThrow()
    })

    it('should throw for corrupted ciphertext', () => {
      const ciphertext = encrypt('secret data', testKey)
      const corrupted = Buffer.from(ciphertext, 'base64')
      // Flip a byte in the encrypted data portion
      corrupted.writeUInt8(corrupted.readUInt8(corrupted.length - 1) ^ 0xff, corrupted.length - 1)
      expect(() => decrypt(corrupted.toString('base64'), testKey)).toThrow()
    })

    it('should throw for corrupted auth tag', () => {
      const ciphertext = encrypt('secret data', testKey)
      const corrupted = Buffer.from(ciphertext, 'base64')
      // Flip a byte in the auth tag (bytes 12-27)
      corrupted.writeUInt8(corrupted.readUInt8(15) ^ 0xff, 15)
      expect(() => decrypt(corrupted.toString('base64'), testKey)).toThrow()
    })

    it('should throw for truncated ciphertext', () => {
      expect(() => decrypt('dG9vc2hvcnQ=', testKey)).toThrow('Invalid ciphertext: too short')
    })

    it('should throw for empty ciphertext', () => {
      expect(() => decrypt('', testKey)).toThrow('Invalid ciphertext: too short')
    })

    it('should throw for corrupted IV', () => {
      const ciphertext = encrypt('secret data', testKey)
      const corrupted = Buffer.from(ciphertext, 'base64')
      // Flip a byte in the IV (first 12 bytes)
      corrupted.writeUInt8(corrupted.readUInt8(0) ^ 0xff, 0)
      expect(() => decrypt(corrupted.toString('base64'), testKey)).toThrow()
    })
  })
})
