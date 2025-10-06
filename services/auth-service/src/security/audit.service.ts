import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';

export enum AuditAction {
    // Authentication actions
    LOGIN = 'login',
    LOGOUT = 'logout',
    REGISTER = 'register',
    PASSWORD_CHANGE = 'password_change',
    PASSWORD_RESET = 'password_reset',
    MFA_ENABLE = 'mfa_enable',
    MFA_DISABLE = 'mfa_disable',
    MFA_VERIFY = 'mfa_verify',
    OAUTH_LINK = 'oauth_link',
    OAUTH_UNLINK = 'oauth_unlink',
    TOKEN_REFRESH = 'token_refresh',
    TOKEN_REVOKE = 'token_revoke',
    ACCOUNT_LOCK = 'account_lock',
    ACCOUNT_UNLOCK = 'account_unlock',

    // Data access actions
    DATA_READ = 'data_read',
    DATA_CREATE = 'data_create',
    DATA_UPDATE = 'data_update',
    DATA_DELETE = 'data_delete',
    DATA_EXPORT = 'data_export',

    // Security actions
    SECURITY_VIOLATION = 'security_violation',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    SUSPICIOUS_ACTIVITY = 'suspicious_activity',
    SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
    XSS_ATTEMPT = 'xss_attempt',

    // Administrative actions
    ADMIN_ACCESS = 'admin_access',
    CONFIG_CHANGE = 'config_change',
    USER_MANAGEMENT = 'user_management',
    ROLE_CHANGE = 'role_change',

    // Privacy actions
    GDPR_REQUEST = 'gdpr_request',
    DATA_ANONYMIZATION = 'data_anonymization',
    CONSENT_CHANGE = 'consent_change'
}

export enum AuditOutcome {
    SUCCESS = 'success',
    FAILURE = 'failure',
    BLOCKED = 'blocked',
    WARNING = 'warning'
}

export interface AuditEvent {
    id?: string;
    timestamp: Date;
    userId?: string;
    email?: string;
    ipAddress: string;
    userAgent?: string;
    service: string;
    action: AuditAction;
    resource?: string;
    outcome: AuditOutcome;
    riskScore: number;
    details?: Record<string, any>;
    sessionId?: string;
    requestId?: string;
    duration?: number;
    errorCode?: string;
    errorMessage?: string;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);
    private readonly serviceName = 'auth-service';

    /**
     * Logs an audit event
     */
    logEvent(event: Partial<AuditEvent> & { action: AuditAction }): void {
        const auditEvent: AuditEvent = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            service: this.serviceName,
            riskScore: 0.1,
            ipAddress: 'unknown',
            outcome: AuditOutcome.SUCCESS,
            ...event
        };

        // Calculate risk score if not provided
        if (!event.riskScore) {
            auditEvent.riskScore = this.calculateRiskScore(auditEvent);
        }

        // Log based on outcome and risk score
        const logData = {
            auditId: auditEvent.id,
            userId: auditEvent.userId,
            email: auditEvent.email,
            ipAddress: auditEvent.ipAddress,
            userAgent: auditEvent.userAgent,
            action: auditEvent.action,
            resource: auditEvent.resource,
            outcome: auditEvent.outcome,
            riskScore: auditEvent.riskScore,
            sessionId: auditEvent.sessionId,
            requestId: auditEvent.requestId,
            duration: auditEvent.duration,
            errorCode: auditEvent.errorCode,
            errorMessage: auditEvent.errorMessage,
            details: auditEvent.details
        };

        switch (auditEvent.outcome) {
            case AuditOutcome.SUCCESS:
                if (auditEvent.riskScore > 0.5) {
                    this.logger.warn('High-risk successful action', logData);
                } else {
                    this.logger.log('Successful action', logData);
                }
                break;
            case AuditOutcome.FAILURE:
                this.logger.error('Failed action', logData);
                break;
            case AuditOutcome.BLOCKED:
                this.logger.warn('Blocked action', logData);
                break;
            case AuditOutcome.WARNING:
                this.logger.warn('Warning action', logData);
                break;
        }

        // In production, also send to external audit system, SIEM, or database
        this.sendToExternalAuditSystem(auditEvent);
    }

    /**
     * Logs authentication events
     */
    logAuthentication(
        action: AuditAction,
        req: Request,
        userId?: string,
        email?: string,
        outcome: AuditOutcome = AuditOutcome.SUCCESS,
        details?: Record<string, any>
    ): void {
        this.logEvent({
            action,
            userId,
            email,
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            outcome,
            details,
            sessionId: this.getSessionId(req),
            requestId: req.headers['x-request-id'] as string
        });
    }

    /**
     * Logs data access events
     */
    logDataAccess(
        action: AuditAction,
        req: Request,
        resource: string,
        userId?: string,
        outcome: AuditOutcome = AuditOutcome.SUCCESS,
        details?: Record<string, any>
    ): void {
        this.logEvent({
            action,
            userId,
            resource,
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            outcome,
            details,
            sessionId: this.getSessionId(req),
            requestId: req.headers['x-request-id'] as string
        });
    }

    /**
     * Logs security violations
     */
    logSecurityViolation(
        violation: AuditAction,
        req: Request,
        details?: Record<string, any>
    ): void {
        this.logEvent({
            action: violation,
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            outcome: AuditOutcome.BLOCKED,
            riskScore: 0.9, // High risk for security violations
            details,
            requestId: req.headers['x-request-id'] as string
        });
    }

    /**
     * Logs administrative actions
     */
    logAdministrativeAction(
        action: AuditAction,
        req: Request,
        adminUserId: string,
        targetResource: string,
        outcome: AuditOutcome = AuditOutcome.SUCCESS,
        details?: Record<string, any>
    ): void {
        this.logEvent({
            action,
            userId: adminUserId,
            resource: targetResource,
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            outcome,
            riskScore: 0.7, // High risk for admin actions
            details,
            sessionId: this.getSessionId(req),
            requestId: req.headers['x-request-id'] as string
        });
    }

    /**
     * Logs GDPR-related actions
     */
    logGDPRAction(
        action: AuditAction,
        req: Request,
        userId: string,
        dataSubject: string,
        outcome: AuditOutcome = AuditOutcome.SUCCESS,
        details?: Record<string, any>
    ): void {
        this.logEvent({
            action,
            userId,
            resource: dataSubject,
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            outcome,
            riskScore: 0.5, // Medium risk for GDPR actions
            details,
            sessionId: this.getSessionId(req),
            requestId: req.headers['x-request-id'] as string
        });
    }

    /**
     * Calculates risk score for an audit event
     */
    private calculateRiskScore(event: AuditEvent): number {
        let baseScore = 0.1;

        // Increase risk based on action type
        switch (event.action) {
            case AuditAction.LOGIN:
                baseScore = event.outcome === AuditOutcome.FAILURE ? 0.5 : 0.2;
                break;
            case AuditAction.PASSWORD_RESET:
                baseScore = 0.4;
                break;
            case AuditAction.MFA_DISABLE:
                baseScore = 0.6;
                break;
            case AuditAction.ACCOUNT_LOCK:
                baseScore = 0.8;
                break;
            case AuditAction.DATA_DELETE:
                baseScore = 0.6;
                break;
            case AuditAction.DATA_EXPORT:
                baseScore = 0.5;
                break;
            case AuditAction.ADMIN_ACCESS:
                baseScore = 0.7;
                break;
            case AuditAction.SECURITY_VIOLATION:
                baseScore = 0.9;
                break;
        }

        // Increase risk for failures
        if (event.outcome === AuditOutcome.FAILURE) {
            const failedAttempts = event.details?.failedAttempts || 0;
            if (failedAttempts > 3) {
                baseScore += 0.3;
            }
        }

        // Increase risk for bulk operations
        const recordCount = event.details?.recordCount || 0;
        if (recordCount > 1000) {
            baseScore += 0.2;
        }

        // Increase risk for sensitive data
        if (event.details?.containsPII) {
            baseScore += 0.3;
        }

        // Cap at 1.0
        return Math.min(baseScore, 1.0);
    }

    /**
     * Gets client IP address considering proxies
     */
    private getClientIP(req: Request): string {
        return req.ip ||
            req.socket.remoteAddress ||
            'unknown';
    }

    /**
     * Gets session ID from request
     */
    private getSessionId(req: Request): string | undefined {
        return req.session?.id || req.headers['x-session-id'] as string;
    }

    /**
     * Generates unique audit event ID
     */
    private generateAuditId(): string {
        return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Sends audit event to external system (SIEM, database, etc.)
     */
    private sendToExternalAuditSystem(event: AuditEvent): void {
        // In production, implement actual external audit system integration
        // For now, just log to console in structured format
        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify({
                type: 'AUDIT_EVENT',
                ...event
            }));
        }
    }

    /**
     * Creates audit context from request
     */
    createAuditContext(req: Request, userId?: string, email?: string) {
        return {
            userId,
            email,
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            sessionId: this.getSessionId(req),
            requestId: req.headers['x-request-id'] as string
        };
    }
}