import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenService } from './token.service';
import { AuditLoggingService } from './audit-logging.service';
import { SessionManagementService } from './session-management.service';

@Injectable()
export class CleanupService {
    private readonly logger = new Logger(CleanupService.name);

    constructor(
        private readonly tokenService: TokenService,
        private readonly auditLoggingService: AuditLoggingService,
        private readonly sessionManagementService: SessionManagementService,
    ) { }

    /**
     * Clean up expired tokens every hour
     */
    @Cron(CronExpression.EVERY_HOUR)
    async cleanupExpiredTokens(): Promise<void> {
        try {
            await this.tokenService.cleanupExpiredTokens();
            this.logger.log('Expired tokens cleanup completed');
        } catch (error) {
            this.logger.error('Failed to cleanup expired tokens', error);
        }
    }

    /**
     * Clean up expired sessions every 30 minutes
     */
    @Cron(CronExpression.EVERY_30_MINUTES)
    async cleanupExpiredSessions(): Promise<void> {
        try {
            await this.sessionManagementService.cleanupExpiredSessions();
            this.logger.log('Expired sessions cleanup completed');
        } catch (error) {
            this.logger.error('Failed to cleanup expired sessions', error);
        }
    }

    /**
     * Clean up old audit logs daily at 2 AM
     */
    @Cron('0 2 * * *')
    async cleanupOldAuditLogs(): Promise<void> {
        try {
            const retentionDays = 90; // Keep logs for 90 days
            await this.auditLoggingService.cleanupOldLogs(retentionDays);
            this.logger.log(`Old audit logs cleanup completed (retention: ${retentionDays} days)`);
        } catch (error) {
            this.logger.error('Failed to cleanup old audit logs', error);
        }
    }

    /**
     * Generate security report weekly on Sundays at 3 AM
     */
    @Cron('0 3 * * 0')
    async generateSecurityReport(): Promise<void> {
        try {
            const failedLogins = await this.auditLoggingService.getFailedLoginAttempts(168); // Last 7 days

            const report = {
                timestamp: new Date(),
                period: 'last_7_days',
                failedLoginAttempts: failedLogins.length,
                uniqueIPs: new Set(failedLogins.map(log => log.ipAddress)).size,
                topFailedIPs: this.getTopFailedIPs(failedLogins, 10),
                suspiciousPatterns: this.analyzeSuspiciousPatterns(failedLogins),
            };

            this.logger.log('Weekly security report generated', report);

            // In a production environment, you might want to:
            // - Send this report via email
            // - Store it in a monitoring system
            // - Trigger alerts for concerning patterns

        } catch (error) {
            this.logger.error('Failed to generate security report', error);
        }
    }

    /**
     * Get top failed login IPs
     */
    private getTopFailedIPs(failedLogins: any[], limit: number): Array<{ ip: string; count: number }> {
        const ipCounts = failedLogins.reduce((acc, log) => {
            acc[log.ipAddress] = (acc[log.ipAddress] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(ipCounts)
            .map(([ip, count]) => ({ ip, count: count as number }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Analyze suspicious patterns in failed logins
     */
    private analyzeSuspiciousPatterns(failedLogins: any[]): any {
        const patterns = {
            rapidAttempts: 0,
            multipleUsers: 0,
            suspiciousUserAgents: 0,
            commonPasswords: 0,
        };

        // Group by IP and analyze patterns
        const ipGroups = failedLogins.reduce((acc, log) => {
            if (!acc[log.ipAddress]) {
                acc[log.ipAddress] = [];
            }
            acc[log.ipAddress].push(log);
            return acc;
        }, {} as Record<string, any[]>);

        Object.values(ipGroups).forEach((logs: any[]) => {
            // Check for rapid attempts (more than 10 in an hour)
            if (logs.length > 10) {
                const timeSpan = new Date(logs[0].timestamp).getTime() - new Date(logs[logs.length - 1].timestamp).getTime();
                if (timeSpan < 60 * 60 * 1000) { // 1 hour
                    patterns.rapidAttempts++;
                }
            }

            // Check for multiple user attempts from same IP
            const uniqueEmails = new Set(logs.map(log => log.email)).size;
            if (uniqueEmails > 5) {
                patterns.multipleUsers++;
            }

            // Check for suspicious user agents
            const suspiciousUA = logs.some(log =>
                !log.userAgent ||
                log.userAgent.includes('bot') ||
                log.userAgent.includes('curl') ||
                log.userAgent.includes('python')
            );
            if (suspiciousUA) {
                patterns.suspiciousUserAgents++;
            }
        });

        return patterns;
    }
}