import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export interface AuditLogEntry {
    userId?: string;
    email?: string;
    ipAddress: string;
    userAgent?: string;
    action: string;
    resource?: string;
    outcome: 'success' | 'failure' | 'blocked';
    details?: Record<string, any>;
    timestamp: Date;
    sessionId?: string;
    riskScore?: number;
}

export enum AuditAction {
    LOGIN_ATTEMPT = 'login_attempt',
    LOGIN_SUCCESS = 'login_success',
    LOGIN_FAILURE = 'login_failure',
    LOGOUT = 'logout',
    REGISTER_ATTEMPT = 'register_attempt',
    REGISTER_SUCCESS = 'register_success',
    REGISTER_FAILURE = 'register_failure',
    PASSWORD_CHANGE = 'password_change',
    PASSWORD_RESET_REQUEST = 'password_reset_request',
    PASSWORD_RESET_SUCCESS = 'password_reset_success',
    MFA_ENABLE = 'mfa_enable',
    MFA_DISABLE = 'mfa_disable',
    MFA_VERIFY_SUCCESS = 'mfa_verify_success',
    MFA_VERIFY_FAILURE = 'mfa_verify_failure',
    OAUTH_LINK = 'oauth_link',
    OAUTH_UNLINK = 'oauth_unlink',
    OAUTH_LOGIN = 'oauth_login',
    ACCOUNT_LOCKED = 'account_locked',
    ACCOUNT_UNLOCKED = 'account_unlocked',
    SUSPICIOUS_ACTIVITY = 'suspicious_activity',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    TOKEN_REFRESH = 'token_refresh',
    TOKEN_REVOKE = 'token_revoke',
    SESSION_EXPIRED = 'session_expired',
    PROFILE_UPDATE = 'profile_update',
}

// Database entity for audit logs
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index(['userId', 'timestamp'])
@Index(['ipAddress', 'timestamp'])
@Index(['action', 'timestamp'])
@Index(['outcome', 'timestamp'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', nullable: true })
    @Index()
    userId?: string;

    @Column({ nullable: true })
    email?: string;

    @Column({ name: 'ip_address' })
    @Index()
    ipAddress: string;

    @Column({ name: 'user_agent', nullable: true, type: 'text' })
    userAgent?: string;

    @Column()
    @Index()
    action: string;

    @Column({ nullable: true })
    resource?: string;

    @Column()
    @Index()
    outcome: 'success' | 'failure' | 'blocked';

    @Column({ type: 'jsonb', nullable: true })
    details?: Record<string, any>;

    @Column({ name: 'session_id', nullable: true })
    sessionId?: string;

    @Column({ name: 'risk_score', nullable: true, type: 'float' })
    riskScore?: number;

    @CreateDateColumn({ name: 'timestamp' })
    @Index()
    timestamp: Date;
}

@Injectable()
export class AuditLoggingService {
    private readonly logger = new Logger(AuditLoggingService.name);
    private readonly enableDatabaseLogging: boolean;

    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepository: Repository<AuditLog>,
        private readonly configService: ConfigService,
    ) {
        this.enableDatabaseLogging = this.configService.get<boolean>('ENABLE_AUDIT_DB_LOGGING', true);
    }

    /**
     * Log an authentication event
     */
    async logAuthEvent(entry: AuditLogEntry): Promise<void> {
        // Always log to application logger
        this.logger.log(`[AUDIT] ${entry.action}: ${entry.outcome}`, {
            userId: entry.userId,
            email: entry.email,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
            resource: entry.resource,
            details: entry.details,
            sessionId: entry.sessionId,
            riskScore: entry.riskScore,
        });

        // Optionally log to database
        if (this.enableDatabaseLogging) {
            try {
                const auditLog = this.auditLogRepository.create({
                    userId: entry.userId,
                    email: entry.email,
                    ipAddress: entry.ipAddress,
                    userAgent: entry.userAgent,
                    action: entry.action,
                    resource: entry.resource,
                    outcome: entry.outcome,
                    details: entry.details,
                    sessionId: entry.sessionId,
                    riskScore: entry.riskScore,
                    timestamp: entry.timestamp,
                });

                await this.auditLogRepository.save(auditLog);
            } catch (error) {
                this.logger.error('Failed to save audit log to database', error);
            }
        }

        // Log high-risk events with additional alerting
        if (entry.riskScore && entry.riskScore > 0.8) {
            this.logger.warn(`[HIGH RISK AUDIT] ${entry.action}`, {
                userId: entry.userId,
                email: entry.email,
                ipAddress: entry.ipAddress,
                riskScore: entry.riskScore,
                details: entry.details,
            });
        }
    }

    /**
     * Log login attempt
     */
    async logLoginAttempt(
        email: string,
        ipAddress: string,
        userAgent: string,
        success: boolean,
        userId?: string,
        details?: Record<string, any>,
    ): Promise<void> {
        await this.logAuthEvent({
            userId,
            email,
            ipAddress,
            userAgent,
            action: success ? AuditAction.LOGIN_SUCCESS : AuditAction.LOGIN_FAILURE,
            outcome: success ? 'success' : 'failure',
            details,
            timestamp: new Date(),
            riskScore: success ? 0.1 : 0.5,
        });
    }

    /**
     * Log registration attempt
     */
    async logRegistrationAttempt(
        email: string,
        ipAddress: string,
        userAgent: string,
        success: boolean,
        userId?: string,
        details?: Record<string, any>,
    ): Promise<void> {
        await this.logAuthEvent({
            userId,
            email,
            ipAddress,
            userAgent,
            action: success ? AuditAction.REGISTER_SUCCESS : AuditAction.REGISTER_FAILURE,
            outcome: success ? 'success' : 'failure',
            details,
            timestamp: new Date(),
            riskScore: 0.3,
        });
    }

    /**
     * Log OAuth events
     */
    async logOAuthEvent(
        action: AuditAction,
        email: string,
        provider: string,
        ipAddress: string,
        userAgent: string,
        success: boolean,
        userId?: string,
        details?: Record<string, any>,
    ): Promise<void> {
        await this.logAuthEvent({
            userId,
            email,
            ipAddress,
            userAgent,
            action,
            resource: provider,
            outcome: success ? 'success' : 'failure',
            details: { provider, ...details },
            timestamp: new Date(),
            riskScore: 0.2,
        });
    }

    /**
     * Log MFA events
     */
    async logMFAEvent(
        action: AuditAction,
        userId: string,
        email: string,
        ipAddress: string,
        userAgent: string,
        success: boolean,
        details?: Record<string, any>,
    ): Promise<void> {
        await this.logAuthEvent({
            userId,
            email,
            ipAddress,
            userAgent,
            action,
            outcome: success ? 'success' : 'failure',
            details,
            timestamp: new Date(),
            riskScore: success ? 0.1 : 0.7,
        });
    }

    /**
     * Log suspicious activity
     */
    async logSuspiciousActivity(
        ipAddress: string,
        activity: string,
        userId?: string,
        email?: string,
        userAgent?: string,
        details?: Record<string, any>,
    ): Promise<void> {
        await this.logAuthEvent({
            userId,
            email,
            ipAddress,
            userAgent,
            action: AuditAction.SUSPICIOUS_ACTIVITY,
            outcome: 'blocked',
            details: { activity, ...details },
            timestamp: new Date(),
            riskScore: 0.9,
        });
    }

    /**
     * Log rate limiting events
     */
    async logRateLimitExceeded(
        ipAddress: string,
        endpoint: string,
        userId?: string,
        email?: string,
        userAgent?: string,
    ): Promise<void> {
        await this.logAuthEvent({
            userId,
            email,
            ipAddress,
            userAgent,
            action: AuditAction.RATE_LIMIT_EXCEEDED,
            resource: endpoint,
            outcome: 'blocked',
            details: { endpoint },
            timestamp: new Date(),
            riskScore: 0.6,
        });
    }

    /**
     * Log account lockout
     */
    async logAccountLockout(
        userId: string,
        email: string,
        ipAddress: string,
        reason: string,
        details?: Record<string, any>,
    ): Promise<void> {
        await this.logAuthEvent({
            userId,
            email,
            ipAddress,
            action: AuditAction.ACCOUNT_LOCKED,
            outcome: 'blocked',
            details: { reason, ...details },
            timestamp: new Date(),
            riskScore: 0.8,
        });
    }

    /**
     * Get audit logs for a user
     */
    async getUserAuditLogs(
        userId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<AuditLog[]> {
        return this.auditLogRepository.find({
            where: { userId },
            order: { timestamp: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Get audit logs for an IP address
     */
    async getIPAuditLogs(
        ipAddress: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<AuditLog[]> {
        return this.auditLogRepository.find({
            where: { ipAddress },
            order: { timestamp: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Get failed login attempts for analysis
     */
    async getFailedLoginAttempts(
        timeWindowHours: number = 24,
    ): Promise<AuditLog[]> {
        const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

        return this.auditLogRepository.find({
            where: {
                action: AuditAction.LOGIN_FAILURE,
                timestamp: { $gte: since } as any,
            },
            order: { timestamp: 'DESC' },
        });
    }

    /**
     * Clean up old audit logs (retention policy)
     */
    async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        const result = await this.auditLogRepository.delete({
            timestamp: { $lt: cutoffDate } as any,
        });

        this.logger.log(`Cleaned up ${result.affected} old audit log entries older than ${retentionDays} days`);
    }
}