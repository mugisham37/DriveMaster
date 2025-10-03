import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';

import { User } from '../entities/user.entity';
import { MfaBackupCode } from '../entities/mfa-backup-code.entity';

export interface MfaSetupResponse {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
    manualEntryKey: string;
}

export interface MfaVerificationResult {
    isValid: boolean;
    usedBackupCode?: boolean;
}

@Injectable()
export class MfaService {
    private readonly logger = new Logger(MfaService.name);
    private readonly appName: string;
    private readonly issuer: string;

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(MfaBackupCode)
        private readonly backupCodeRepository: Repository<MfaBackupCode>,
        private readonly configService: ConfigService,
    ) {
        this.appName = this.configService.get<string>('APP_NAME', 'Adaptive Learning Platform');
        this.issuer = this.configService.get<string>('MFA_ISSUER', 'AdaptiveLearning');
    }

    /**
     * Generate MFA setup data for a user
     */
    async generateMfaSetup(userId: string, userEmail: string): Promise<MfaSetupResponse> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.mfaEnabled) {
            throw new BadRequestException('MFA is already enabled for this user');
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `${this.appName} (${userEmail})`,
            issuer: this.issuer,
            length: 32,
        });

        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        // Generate backup codes
        const backupCodes = this.generateBackupCodes();

        // Store temporary secret (not yet enabled)
        user.mfaSecret = secret.base32;
        await this.userRepository.save(user);

        // Store backup codes (inactive until MFA is enabled)
        await this.storeBackupCodes(userId, backupCodes, false);

        this.logger.log(`MFA setup generated for user: ${userId}`);

        return {
            secret: secret.base32,
            qrCodeUrl,
            backupCodes,
            manualEntryKey: secret.base32,
        };
    }

    /**
     * Verify TOTP code and enable MFA
     */
    async enableMfa(userId: string, totpCode: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.mfaEnabled) {
            throw new BadRequestException('MFA is already enabled');
        }

        if (!user.mfaSecret) {
            throw new BadRequestException('MFA setup not initiated. Please generate setup first.');
        }

        // Verify the TOTP code
        const isValid = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: totpCode,
            window: 2, // Allow 2 time steps before/after for clock drift
        });

        if (!isValid) {
            throw new UnauthorizedException('Invalid TOTP code');
        }

        // Enable MFA
        user.mfaEnabled = true;
        await this.userRepository.save(user);

        // Activate backup codes
        await this.activateBackupCodes(userId);

        this.logger.log(`MFA enabled for user: ${userId}`);
    }

    /**
     * Disable MFA for a user
     */
    async disableMfa(userId: string, totpCode: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (!user.mfaEnabled) {
            throw new BadRequestException('MFA is not enabled');
        }

        // Verify current TOTP code before disabling
        const verification = await this.verifyMfaCode(userId, totpCode);
        if (!verification.isValid) {
            throw new UnauthorizedException('Invalid TOTP code');
        }

        // Disable MFA
        user.mfaEnabled = false;
        user.mfaSecret = null;
        await this.userRepository.save(user);

        // Remove all backup codes
        await this.backupCodeRepository.delete({ userId });

        this.logger.log(`MFA disabled for user: ${userId}`);
    }

    /**
     * Verify MFA code (TOTP or backup code)
     */
    async verifyMfaCode(userId: string, code: string): Promise<MfaVerificationResult> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.mfaEnabled || !user.mfaSecret) {
            throw new BadRequestException('MFA is not enabled for this user');
        }

        // First try TOTP verification
        const isTotpValid = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: code,
            window: 2,
        });

        if (isTotpValid) {
            return { isValid: true, usedBackupCode: false };
        }

        // If TOTP fails, try backup codes
        const backupCodeResult = await this.verifyBackupCode(userId, code);
        if (backupCodeResult) {
            return { isValid: true, usedBackupCode: true };
        }

        return { isValid: false };
    }

    /**
     * Generate new backup codes
     */
    async regenerateBackupCodes(userId: string, totpCode: string): Promise<string[]> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.mfaEnabled) {
            throw new BadRequestException('MFA is not enabled');
        }

        // Verify current TOTP code
        const verification = await this.verifyMfaCode(userId, totpCode);
        if (!verification.isValid || verification.usedBackupCode) {
            throw new UnauthorizedException('Invalid TOTP code. Backup codes cannot be used for this operation.');
        }

        // Remove old backup codes
        await this.backupCodeRepository.delete({ userId });

        // Generate new backup codes
        const backupCodes = this.generateBackupCodes();
        await this.storeBackupCodes(userId, backupCodes, true);

        this.logger.log(`Backup codes regenerated for user: ${userId}`);

        return backupCodes;
    }

    /**
     * Get remaining backup codes count
     */
    async getRemainingBackupCodesCount(userId: string): Promise<number> {
        return this.backupCodeRepository.count({
            where: { userId, isUsed: false, isActive: true },
        });
    }

    /**
     * Check if MFA is required for sensitive operations
     */
    async isMfaRequiredForOperation(userId: string, operation: string): Promise<boolean> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.mfaEnabled) {
            return false;
        }

        // Define operations that require MFA
        const sensitiveOperations = [
            'disable_mfa',
            'change_password',
            'link_oauth_provider',
            'unlink_oauth_provider',
            'delete_account',
            'export_data',
            'regenerate_backup_codes',
        ];

        return sensitiveOperations.includes(operation);
    }

    /**
     * Generate backup codes
     */
    private generateBackupCodes(count: number = 10): string[] {
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            // Generate 8-character alphanumeric code
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code);
        }
        return codes;
    }

    /**
     * Store backup codes in database
     */
    private async storeBackupCodes(
        userId: string,
        codes: string[],
        isActive: boolean,
    ): Promise<void> {
        const backupCodes = codes.map(code => {
            const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
            return this.backupCodeRepository.create({
                userId,
                hashedCode,
                isActive,
                isUsed: false,
            });
        });

        await this.backupCodeRepository.save(backupCodes);
    }

    /**
     * Activate backup codes when MFA is enabled
     */
    private async activateBackupCodes(userId: string): Promise<void> {
        await this.backupCodeRepository.update(
            { userId, isActive: false },
            { isActive: true },
        );
    }

    /**
     * Verify backup code
     */
    private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
        const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

        const backupCode = await this.backupCodeRepository.findOne({
            where: {
                userId,
                hashedCode,
                isUsed: false,
                isActive: true,
            },
        });

        if (!backupCode) {
            return false;
        }

        // Mark backup code as used
        backupCode.isUsed = true;
        backupCode.usedAt = new Date();
        await this.backupCodeRepository.save(backupCode);

        this.logger.log(`Backup code used for user: ${userId}`);

        return true;
    }
}