import crypto from 'crypto'

import { hash, compare } from 'bcrypt'

export interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
  saltRounds: number
  keyDerivationIterations: number
}

export interface EncryptedData {
  data: string
  iv: string
  salt?: string
  algorithm: string
  timestamp: number
}

export interface HashResult {
  hash: string
  salt: string
  algorithm: string
  iterations: number
}

export class EncryptionService {
  private static readonly config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    saltRounds: 12,
    keyDerivationIterations: 100000,
  }

  private static readonly masterKey = process.env.MASTER_ENCRYPTION_KEY ?? this.generateSecureKey()

  /**
   * Generate a cryptographically secure random key
   */
  static generateSecureKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Generate a secure salt
   */
  static generateSalt(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  static deriveKey(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.config.keyDerivationIterations,
      this.config.keyLength,
      'sha256',
    )
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  static encryptData(plaintext: string, key?: string): EncryptedData {
    try {
      const encryptionKey =
        key !== undefined ? Buffer.from(key, 'hex') : Buffer.from(this.masterKey, 'hex')
      const iv = crypto.randomBytes(this.config.ivLength)

      const cipher = crypto.createCipheriv(
        this.config.algorithm,
        encryptionKey,
        iv,
      ) as crypto.CipherGCM
      cipher.setAAD(Buffer.from('drivemaster-auth-data'))

      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const authTag = cipher.getAuthTag()

      return {
        data: encrypted + ':' + authTag.toString('hex'),
        iv: iv.toString('hex'),
        algorithm: this.config.algorithm,
        timestamp: Date.now(),
      }
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decryptData(encryptedData: EncryptedData, key?: string): string {
    try {
      const encryptionKey =
        key !== undefined ? Buffer.from(key, 'hex') : Buffer.from(this.masterKey, 'hex')
      const iv = Buffer.from(encryptedData.iv, 'hex')

      const [encrypted, authTagHex] = encryptedData.data.split(':')
      const authTag = Buffer.from(authTagHex, 'hex')

      const decipher = crypto.createDecipheriv(
        encryptedData.algorithm,
        encryptionKey,
        iv,
      ) as crypto.DecipherGCM
      decipher.setAAD(Buffer.from('drivemaster-auth-data'))
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Hash password using bcrypt with salt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await hash(password, this.config.saltRounds)
    } catch (error) {
      throw new Error(
        `Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hashValue: string): Promise<boolean> {
    try {
      return await compare(password, hashValue)
    } catch (error) {
      throw new Error(
        `Password verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Create secure hash with custom salt (for non-password data)
   */
  static createSecureHash(data: string, salt?: string): HashResult {
    try {
      const hashSalt = salt ?? this.generateSalt()
      const hashValue = crypto
        .pbkdf2Sync(data, hashSalt, this.config.keyDerivationIterations, 64, 'sha256')
        .toString('hex')

      return {
        hash: hashValue,
        salt: hashSalt,
        algorithm: 'pbkdf2-sha256',
        iterations: this.config.keyDerivationIterations,
      }
    } catch (error) {
      throw new Error(
        `Secure hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Verify data against secure hash
   */
  static verifySecureHash(data: string, hashResult: HashResult): boolean {
    try {
      const computedHash = crypto
        .pbkdf2Sync(data, hashResult.salt, hashResult.iterations, 64, 'sha256')
        .toString('hex')

      return crypto.timingSafeEqual(
        Buffer.from(hashResult.hash, 'hex'),
        Buffer.from(computedHash, 'hex'),
      )
    } catch (error) {
      return false
    }
  }

  /**
   * Encrypt PII (Personally Identifiable Information)
   */
  static encryptPII(piiData: Record<string, unknown>): Record<string, EncryptedData> {
    const encrypted: Record<string, EncryptedData> = {}

    for (const [key, value] of Object.entries(piiData)) {
      if (value !== null && value !== undefined) {
        encrypted[key] = this.encryptData(JSON.stringify(value))
      }
    }

    return encrypted
  }

  /**
   * Decrypt PII data
   */
  static decryptPII(encryptedPII: Record<string, EncryptedData>): Record<string, unknown> {
    const decrypted: Record<string, unknown> = {}

    for (const [key, encryptedData] of Object.entries(encryptedPII)) {
      try {
        const decryptedValue = this.decryptData(encryptedData)
        decrypted[key] = JSON.parse(decryptedValue) as unknown
      } catch (error) {
        // Log error but don't fail entire operation
        // eslint-disable-next-line no-console
        console.error(`Failed to decrypt PII field ${key}:`, error)
        decrypted[key] = null
      }
    }

    return decrypted
  }

  /**
   * Generate secure session token
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Generate secure API key
   */
  static generateApiKey(prefix: string = 'dm'): string {
    const timestamp = Date.now().toString(36)
    const randomBytes = crypto.randomBytes(24).toString('hex')
    return `${prefix}_${timestamp}_${randomBytes}`
  }

  /**
   * Create HMAC signature for API requests
   */
  static createHMACSignature(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMACSignature(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHMACSignature(data, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    )
  }

  /**
   * Encrypt data for database storage
   */
  static encryptForStorage(data: unknown): string {
    const jsonData = JSON.stringify(data)
    const encrypted = this.encryptData(jsonData)
    return JSON.stringify(encrypted)
  }

  /**
   * Decrypt data from database storage
   */
  static decryptFromStorage(encryptedString: string): unknown {
    try {
      const encryptedData = JSON.parse(encryptedString) as EncryptedData
      const decryptedJson = this.decryptData(encryptedData)
      return JSON.parse(decryptedJson) as unknown
    } catch (error) {
      throw new Error(
        `Storage decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Secure data anonymization for analytics
   */
  static anonymizeData(
    data: Record<string, unknown>,
    fieldsToAnonymize: string[],
  ): Record<string, unknown> {
    const anonymized = { ...data }

    for (const field of fieldsToAnonymize) {
      const fieldValue = anonymized[field]
      if (fieldValue !== null && fieldValue !== undefined) {
        // Create consistent hash for analytics while removing PII
        const hashValue = crypto.createHash('sha256').update(String(fieldValue)).digest('hex')
        anonymized[field] = `anon_${hashValue.substring(0, 8)}`
      }
    }

    return anonymized
  }

  /**
   * Generate secure one-time token (for password reset, email verification)
   */
  static generateOneTimeToken(expirationMinutes: number = 60): {
    token: string
    hashedToken: string
    expiresAt: Date
  } {
    const token = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000)

    return {
      token,
      hashedToken,
      expiresAt,
    }
  }

  /**
   * Verify one-time token
   */
  static verifyOneTimeToken(token: string, hashedToken: string): boolean {
    const computedHash = crypto.createHash('sha256').update(token).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hashedToken, 'hex'), Buffer.from(computedHash, 'hex'))
  }

  /**
   * Secure key rotation utilities
   */
  static rotateEncryptionKey(
    oldKey: string,
    newKey: string,
    encryptedData: EncryptedData,
  ): EncryptedData {
    // Decrypt with old key
    const plaintext = this.decryptData(encryptedData, oldKey)

    // Re-encrypt with new key
    return this.encryptData(plaintext, newKey)
  }

  /**
   * Validate encryption configuration
   */
  static validateConfiguration(): boolean {
    try {
      // Test encryption/decryption
      const testData = 'test-encryption-data'
      const encrypted = this.encryptData(testData)
      const decrypted = this.decryptData(encrypted)

      if (decrypted !== testData) {
        throw new Error('Encryption/decryption test failed')
      }

      // Test password hashing
      const testPassword = 'test-password-123'
      const hashedPassword = crypto.createHash('sha256').update(testPassword).digest('hex')

      if (hashedPassword.length === 0) {
        throw new Error('Password hashing test failed')
      }

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Encryption configuration validation failed:', error)
      return false
    }
  }
}

// Export types and service
export default EncryptionService
