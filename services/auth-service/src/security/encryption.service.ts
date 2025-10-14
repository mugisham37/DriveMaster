import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class EncryptionService {
    private readonly logger = new Logger(EncryptionService.name);
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16; // 128 bits
    private readonly tagLength = 16; // 128 bits
    private readonly saltLength = 32; // 256 bits

    private masterKey: Buffer;

    constructor() {
        const keyString = process.env.ENCRYPTION_KEY || process.env.MASTER_ENCRYPTION_KEY;
        if (!keyString) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }

        // Derive a consistent key from the provided string
        this.masterKey = crypto.scryptSync(keyString, 'salt', this.keyLength);
    }

    /**
     * Encrypts plaintext using AES-256-GCM
     */
    encrypt(plaintext: string): string {
        if (!plaintext) return plaintext;

        try {
            // Generate random IV
            const iv = crypto.randomBytes(this.ivLength);

            // Create cipher
            const cipher = crypto.createCipher(this.algorithm, this.masterKey);
            cipher.setAAD(Buffer.from('auth-service', 'utf8')); // Additional authenticated data

            // Encrypt
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Get authentication tag
            const tag = cipher.getAuthTag();

            // Combine IV + tag + encrypted data
            const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);

            return combined.toString('base64');
        } catch (error) {
            this.logger.error('Encryption failed', error);
            throw new Error('Encryption failed');
        }
    }

    /**
     * Decrypts ciphertext using AES-256-GCM
     */
    decrypt(ciphertext: string): string {
        if (!ciphertext) return ciphertext;

        try {
            // Decode from base64
            const combined = Buffer.from(ciphertext, 'base64');

            // Extract components
            const iv = combined.slice(0, this.ivLength);
            const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
            const encrypted = combined.slice(this.ivLength + this.tagLength);

            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
            decipher.setAAD(Buffer.from('auth-service', 'utf8'));
            decipher.setAuthTag(tag);

            // Decrypt
            let decrypted = decipher.update(encrypted, null, 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            this.logger.error('Decryption failed', error);
            throw new Error('Decryption failed');
        }
    }

    /**
     * Encrypts PII with deterministic encryption for searchability
     */
    encryptPII(pii: string, salt?: string): string {
        if (!pii) return pii;

        try {
            // Use provided salt or generate from PII for deterministic encryption
            const piiSalt = salt || crypto.createHash('sha256').update(pii).digest('hex').slice(0, 32);

            // Derive key from PII and salt for deterministic encryption
            const key = crypto.scryptSync(pii, piiSalt, this.keyLength);

            // Use fixed IV for deterministic encryption (less secure but allows searching)
            const iv = crypto.createHash('md5').update(piiSalt).digest();

            // Encrypt using AES-256-CBC for deterministic results
            const cipher = crypto.createCipher('aes-256-cbc', key);
            let encrypted = cipher.update(pii, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            return Buffer.from(encrypted, 'hex').toString('base64');
        } catch (error) {
            this.logger.error('PII encryption failed', error);
            throw new Error('PII encryption failed');
        }
    }

    /**
     * Decrypts PII encrypted with deterministic encryption
     */
    decryptPII(encryptedPII: string, originalPII: string, salt?: string): string {
        if (!encryptedPII) return encryptedPII;

        try {
            // Use same salt as encryption
            const piiSalt = salt || crypto.createHash('sha256').update(originalPII).digest('hex').slice(0, 32);

            // Derive same key
            const key = crypto.scryptSync(originalPII, piiSalt, this.keyLength);

            // Use same fixed IV
            const iv = crypto.createHash('md5').update(piiSalt).digest();

            // Decrypt
            const encrypted = Buffer.from(encryptedPII, 'base64');
            const decipher = crypto.createDecipher('aes-256-cbc', key);
            let decrypted = decipher.update(encrypted, null, 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            this.logger.error('PII decryption failed', error);
            throw new Error('PII decryption failed');
        }
    }

    /**
     * Hashes password using Argon2id
     */
    async hashPassword(password: string): Promise<string> {
        try {
            return await argon2.hash(password, {
                type: argon2.argon2id,
                memoryCost: 2 ** 16, // 64 MB
                timeCost: 3,
                parallelism: 1,
                hashLength: 32
            });
        } catch (error) {
            this.logger.error('Password hashing failed', error);
            throw new Error('Password hashing failed');
        }
    }

    /**
     * Verifies password against Argon2id hash
     */
    async verifyPassword(password: string, hash: string): Promise<boolean> {
        try {
            return await argon2.verify(hash, password);
        } catch (error) {
            this.logger.error('Password verification failed', error);
            return false;
        }
    }

    /**
     * Generates cryptographically secure random token
     */
    generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('base64url');
    }

    /**
     * Creates SHA-256 hash
     */
    hashSHA256(input: string): string {
        return crypto.createHash('sha256').update(input).digest('base64');
    }

    /**
     * Generates HMAC signature
     */
    generateHMAC(data: string, secret?: string): string {
        const hmacSecret = secret || process.env.HMAC_SECRET || 'default-secret';
        return crypto.createHmac('sha256', hmacSecret).update(data).digest('hex');
    }

    /**
     * Verifies HMAC signature
     */
    verifyHMAC(data: string, signature: string, secret?: string): boolean {
        const expectedSignature = this.generateHMAC(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * Encrypts data for database storage
     */
    encryptForStorage(data: any): string {
        const jsonString = JSON.stringify(data);
        return this.encrypt(jsonString);
    }

    /**
     * Decrypts data from database storage
     */
    decryptFromStorage<T>(encryptedData: string): T {
        const jsonString = this.decrypt(encryptedData);
        return JSON.parse(jsonString);
    }

    /**
     * Generates encryption key for key rotation
     */
    generateEncryptionKey(): string {
        return crypto.randomBytes(this.keyLength).toString('base64');
    }

    /**
     * Derives key from password and salt using PBKDF2
     */
    deriveKey(password: string, salt: string, iterations: number = 100000): Buffer {
        return crypto.pbkdf2Sync(password, salt, iterations, this.keyLength, 'sha256');
    }
}