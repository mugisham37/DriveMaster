import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { AuditService, AuditAction, AuditOutcome } from './audit.service';

export interface GDPRRequest {
    id: string;
    userId: string;
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    requestedAt: Date;
    completedAt?: Date;
    requestedBy: string;
    reason?: string;
    data?: any;
}

export interface DataExportResult {
    personalData: any;
    activityLogs: any[];
    preferences: any;
    exportedAt: Date;
    format: 'json' | 'csv' | 'xml';
}

@Injectable()
export class GDPRService {
    private readonly logger = new Logger(GDPRService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Handle data access request (Article 15)
     */
    async handleDataAccessRequest(userId: string, requestedBy: string): Promise<DataExportResult> {
        this.logger.log(`Processing data access request for user ${userId}`);

        try {
            // Get user data
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: ['oauthProviders', 'refreshTokens', 'mfaBackupCodes']
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Collect all personal data
            const personalData = {
                profile: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    lastLoginAt: user.lastLoginAt,
                    isActive: user.isActive,
                    emailVerified: user.emailVerified,
                    mfaEnabled: user.mfaEnabled,
                },
                authentication: {
                    oauthProviders: user.oauthProviders?.map(provider => ({
                        provider: provider.provider,
                        providerId: provider.providerUserId,
                        connectedAt: provider.createdAt,
                    })) || [],
                    mfaEnabled: user.mfaEnabled,
                    backupCodesCount: user.mfaBackupCodes?.length || 0,
                },
                sessions: {
                    activeTokensCount: user.refreshTokens?.filter(token =>
                        new Date(token.expiresAt) > new Date()
                    ).length || 0,
                }
            };

            // Get activity logs (implement based on your audit log storage)
            const activityLogs = await this.getActivityLogs(userId);

            // Get user preferences (implement based on your preferences storage)
            const preferences = await this.getUserPreferences(userId);

            const exportResult: DataExportResult = {
                personalData,
                activityLogs,
                preferences,
                exportedAt: new Date(),
                format: 'json'
            };

            // Log the access request
            this.auditService.logEvent({
                action: AuditAction.GDPR_REQUEST,
                userId: requestedBy,
                resource: userId,
                outcome: AuditOutcome.SUCCESS,
                details: {
                    requestType: 'access',
                    dataExported: true,
                    recordCount: Object.keys(personalData).length
                }
            });

            return exportResult;
        } catch (error) {
            this.logger.error(`Failed to process data access request for user ${userId}`, error);

            this.auditService.logEvent({
                action: AuditAction.GDPR_REQUEST,
                userId: requestedBy,
                resource: userId,
                outcome: AuditOutcome.FAILURE,
                details: {
                    requestType: 'access',
                    error: error.message
                }
            });

            throw error;
        }
    }

    /**
     * Handle data erasure request (Article 17 - Right to be forgotten)
     */
    async handleDataErasureRequest(userId: string, requestedBy: string): Promise<void> {
        this.logger.log(`Processing data erasure request for user ${userId}`);

        try {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: ['oauthProviders', 'refreshTokens', 'mfaBackupCodes']
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Anonymize user data instead of hard delete to maintain referential integrity
            await this.anonymizeUserData(user);

            // Log the erasure request
            this.auditService.logEvent({
                action: AuditAction.DATA_ANONYMIZATION,
                userId: requestedBy,
                resource: userId,
                outcome: AuditOutcome.SUCCESS,
                details: {
                    requestType: 'erasure',
                    anonymized: true
                }
            });

            this.logger.log(`Successfully anonymized data for user ${userId}`);
        } catch (error) {
            this.logger.error(`Failed to process data erasure request for user ${userId}`, error);

            this.auditService.logEvent({
                action: AuditAction.GDPR_REQUEST,
                userId: requestedBy,
                resource: userId,
                outcome: AuditOutcome.FAILURE,
                details: {
                    requestType: 'erasure',
                    error: error.message
                }
            });

            throw error;
        }
    }

    /**
     * Handle data portability request (Article 20)
     */
    async handleDataPortabilityRequest(userId: string, requestedBy: string, format: 'json' | 'csv' | 'xml' = 'json'): Promise<DataExportResult> {
        this.logger.log(`Processing data portability request for user ${userId}`);

        const exportResult = await this.handleDataAccessRequest(userId, requestedBy);
        exportResult.format = format;

        // Convert to requested format if needed
        if (format !== 'json') {
            // Implement format conversion logic here
            this.logger.warn(`Format conversion to ${format} not yet implemented, returning JSON`);
        }

        return exportResult;
    }

    /**
     * Anonymize user data while preserving system integrity
     */
    private async anonymizeUserData(user: User): Promise<void> {
        const anonymizedEmail = `anonymized_${user.id}@deleted.local`;
        const anonymizedName = 'Deleted User';

        // Update user with anonymized data
        await this.userRepository.update(user.id, {
            email: anonymizedEmail,
            firstName: anonymizedName,
            lastName: '',
            hashedPassword: null,
            isActive: false,
            emailVerified: false,
            mfaEnabled: false,
            mfaSecret: null,
            lastLoginAt: null,
        });

        // Remove OAuth connections
        if (user.oauthProviders) {
            // Implement OAuth provider cleanup
        }

        // Revoke all refresh tokens
        if (user.refreshTokens) {
            // Implement token revocation
        }

        // Remove MFA backup codes
        if (user.mfaBackupCodes) {
            // Implement MFA cleanup
        }
    }

    /**
     * Get activity logs for user (implement based on your audit system)
     */
    private async getActivityLogs(userId: string): Promise<any[]> {
        // This should query your audit log system
        // For now, return empty array
        return [];
    }

    /**
     * Get user preferences (implement based on your preferences system)
     */
    private async getUserPreferences(userId: string): Promise<any> {
        // This should query your user preferences system
        // For now, return empty object
        return {};
    }

    /**
     * Validate GDPR request
     */
    async validateGDPRRequest(userId: string, requestType: string, requestedBy: string): Promise<boolean> {
        // Implement validation logic
        // Check if user exists, if requester has permission, etc.
        const user = await this.userRepository.findOne({ where: { id: userId } });
        return !!user;
    }

    /**
     * Get GDPR request status
     */
    async getGDPRRequestStatus(requestId: string): Promise<GDPRRequest | null> {
        // Implement request status tracking
        // This would typically query a GDPR requests table
        return null;
    }
}