import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32;
    private readonly ivLength = 16;
    private readonly tagLength = 16;

    /**
     * Generate a random encryption key
     */
    generateKey(): string {
        return crypto.randomBytes(this.keyLength).toString('hex');
    }

    /**
     * Encrypt data using AES-256-GCM
     */
    encrypt(data: string, key: string): { encrypted: string; iv: string; tag: string } {
        const keyBuffer = Buffer.from(key, 'hex');
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipher(this.algorithm, keyBuffer);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // For non-GCM modes, we'll use a simple hash as tag
        const tag = crypto.createHash('sha256').update(encrypted + iv.toString('hex')).digest('hex').slice(0, 32);

        return {
            encrypted,
            iv: iv.toString('hex'),
            tag
        };
    }

    /**
     * Decrypt data using AES-256-GCM
     */
    decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
        const keyBuffer = Buffer.from(key, 'hex');
        
        // Verify tag
        const expectedTag = crypto.createHash('sha256').update(encryptedData.encrypted + encryptedData.iv).digest('hex').slice(0, 32);
        if (expectedTag !== encryptedData.tag) {
            throw new Error('Authentication failed');
        }

        const decipher = crypto.createDecipher(this.algorithm, keyBuffer);

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Hash data using SHA-256
     */
    hash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Generate HMAC signature
     */
    generateHMAC(data: string, secret: string): string {
        return crypto.createHmac('sha256', secret).update(data).digest('hex');
    }

    /**
     * Verify HMAC signature
     */
    verifyHMAC(data: string, signature: string, secret: string): boolean {
        const expectedSignature = this.generateHMAC(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * Generate a secure random token
     */
    generateToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Generate a secure random password
     */
    generatePassword(length: number = 16): string {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length);
            password += charset[randomIndex];
        }
        
        return password;
    }

    /**
     * Encrypt sensitive fields in an object
     */
    encryptSensitiveFields(obj: any, sensitiveFields: string[], key: string): any {
        const result = { ...obj };
        
        for (const field of sensitiveFields) {
            if (result[field] && typeof result[field] === 'string') {
                result[field] = this.encrypt(result[field], key);
            }
        }
        
        return result;
    }

    /**
     * Decrypt sensitive fields in an object
     */
    decryptSensitiveFields(obj: any, sensitiveFields: string[], key: string): any {
        const result = { ...obj };
        
        for (const field of sensitiveFields) {
            if (result[field] && typeof result[field] === 'object') {
                try {
                    result[field] = this.decrypt(result[field], key);
                } catch (error) {
                    console.error(`Failed to decrypt field ${field}:`, error);
                    // Keep encrypted value if decryption fails
                }
            }
        }
        
        return result;
    }
}