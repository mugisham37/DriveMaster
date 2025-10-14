import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
    /**
     * Hash a password using Argon2
     */
    async hashPassword(password: string): Promise<string> {
        return argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16, // 64 MB
            timeCost: 3,
            parallelism: 1,
        });
    }

    /**
     * Verify a password against its hash
     */
    async verifyPassword(hash: string, password: string): Promise<boolean> {
        try {
            return await argon2.verify(hash, password);
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate password strength
     */
    validatePasswordStrength(password: string): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (password.length > 128) {
            errors.push('Password must be less than 128 characters long');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        // Check for common patterns
        if (/(.)\1{2,}/.test(password)) {
            errors.push('Password cannot contain repeated characters');
        }

        if (/123|abc|qwe|password|admin/i.test(password)) {
            errors.push('Password cannot contain common patterns');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}