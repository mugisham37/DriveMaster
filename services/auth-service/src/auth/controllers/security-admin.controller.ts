import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuditLoggingService } from '../services/audit-logging.service';
import { RateLimitingService } from '../services/rate-limiting.service';
import { SessionManagementService } from '../services/session-management.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../entities/user.entity';

// This would typically have additional role-based guards for admin access
@Controller('auth/admin/security')
@UseGuards(JwtAuthGuard)
export class SecurityAdminController {
    constructor(
        private readonly auditLoggingService: AuditLoggingService,
        private readonly rateLimitingService: RateLimitingService,
        private readonly sessionManagementService: SessionManagementService,
    ) { }

    /**
     * Get audit logs for a specific user
     */
    @Get('audit-logs/user/:userId')
    async getUserAuditLogs(
        @Param('userId') userId: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0,
    ) {
        const logs = await this.auditLoggingService.getUserAuditLogs(userId, limit, offset);
        return {
            logs,
            count: logs.length,
            limit,
            offset,
        };
    }

    /**
     * Get audit logs for a specific IP address
     */
    @Get('audit-logs/ip/:ipAddress')
    async getIPAuditLogs(
        @Param('ipAddress') ipAddress: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0,
    ) {
        const logs = await this.auditLoggingService.getIPAuditLogs(ipAddress, limit, offset);
        return {
            logs,
            count: logs.length,
            limit,
            offset,
        };
    }

    /**
     * Get recent failed login attempts
     */
    @Get('failed-logins')
    async getFailedLoginAttempts(@Query('hours') hours: number = 24) {
        const attempts = await this.auditLoggingService.getFailedLoginAttempts(hours);

        // Aggregate by IP address
        const ipStats = attempts.reduce((acc, attempt) => {
            const ip = attempt.ipAddress;
            if (!acc[ip]) {
                acc[ip] = {
                    ipAddress: ip,
                    attempts: 0,
                    uniqueEmails: new Set(),
                    lastAttempt: attempt.timestamp,
                };
            }
            acc[ip].attempts++;
            if (attempt.email) {
                acc[ip].uniqueEmails.add(attempt.email);
            }
            if (attempt.timestamp > acc[ip].lastAttempt) {
                acc[ip].lastAttempt = attempt.timestamp;
            }
            return acc;
        }, {} as Record<string, any>);

        // Convert to array and add unique email count
        const stats = Object.values(ipStats).map((stat: any) => ({
            ...stat,
            uniqueEmails: stat.uniqueEmails.size,
        }));

        return {
            totalAttempts: attempts.length,
            uniqueIPs: stats.length,
            timeWindow: `${hours} hours`,
            ipStatistics: stats.sort((a: any, b: any) => b.attempts - a.attempts),
        };
    }

    /**
     * Get suspicious activities for an IP
     */
    @Get('suspicious-activity/:ipAddress')
    async getSuspiciousActivities(@Param('ipAddress') ipAddress: string) {
        const activities = await this.rateLimitingService.getSuspiciousActivities(ipAddress);
        const isBlocked = await this.rateLimitingService.isSuspiciouslyBlocked(ipAddress);

        return {
            ipAddress,
            isBlocked,
            activities,
            count: activities.length,
        };
    }

    /**
     * Clear rate limits for an IP (emergency unblock)
     */
    @Delete('rate-limit/:ipAddress/:endpoint')
    @HttpCode(HttpStatus.NO_CONTENT)
    async clearRateLimit(
        @Param('ipAddress') ipAddress: string,
        @Param('endpoint') endpoint: string,
        @CurrentUser() admin: User,
    ) {
        await this.rateLimitingService.clearRateLimit(ipAddress, endpoint);

        // Log admin action
        await this.auditLoggingService.logAuthEvent({
            userId: admin.id,
            email: admin.email,
            ipAddress: 'admin-action',
            action: 'rate_limit_cleared',
            outcome: 'success',
            details: { targetIp: ipAddress, endpoint },
            timestamp: new Date(),
            riskScore: 0.3,
        });
    }

    /**
     * Get active sessions for a user
     */
    @Get('sessions/user/:userId')
    async getUserSessions(@Param('userId') userId: string) {
        const sessions = await this.sessionManagementService.getUserSessions(userId);
        return {
            userId,
            sessions,
            count: sessions.length,
        };
    }

    /**
     * Invalidate a specific session
     */
    @Delete('sessions/:sessionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async invalidateSession(
        @Param('sessionId') sessionId: string,
        @CurrentUser() admin: User,
    ) {
        await this.sessionManagementService.invalidateSession(sessionId);

        // Log admin action
        await this.auditLoggingService.logAuthEvent({
            userId: admin.id,
            email: admin.email,
            ipAddress: 'admin-action',
            action: 'session_invalidated_by_admin',
            outcome: 'success',
            details: { targetSessionId: sessionId },
            timestamp: new Date(),
            riskScore: 0.3,
        });
    }

    /**
     * Invalidate all sessions for a user
     */
    @Delete('sessions/user/:userId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async invalidateAllUserSessions(
        @Param('userId') userId: string,
        @CurrentUser() admin: User,
    ) {
        await this.sessionManagementService.invalidateAllUserSessions(userId);

        // Log admin action
        await this.auditLoggingService.logAuthEvent({
            userId: admin.id,
            email: admin.email,
            ipAddress: 'admin-action',
            action: 'all_user_sessions_invalidated_by_admin',
            outcome: 'success',
            details: { targetUserId: userId },
            timestamp: new Date(),
            riskScore: 0.4,
        });
    }

    /**
     * Get security statistics
     */
    @Get('statistics')
    async getSecurityStatistics(@Query('hours') hours: number = 24) {
        const failedLogins = await this.auditLoggingService.getFailedLoginAttempts(hours);

        const stats = {
            timeWindow: `${hours} hours`,
            failedLoginAttempts: failedLogins.length,
            uniqueFailedIPs: new Set(failedLogins.map(log => log.ipAddress)).size,
            topFailedIPs: this.getTopIPs(failedLogins, 5),
            suspiciousUserAgents: this.getSuspiciousUserAgents(failedLogins),
            hourlyDistribution: this.getHourlyDistribution(failedLogins),
        };

        return stats;
    }

    /**
     * Get session activity for a specific session
     */
    @Get('sessions/:sessionId/activity')
    async getSessionActivity(
        @Param('sessionId') sessionId: string,
        @Query('limit') limit: number = 50,
    ) {
        const activity = await this.sessionManagementService.getSessionActivity(sessionId, limit);
        return {
            sessionId,
            activity,
            count: activity.length,
        };
    }

    /**
     * Helper method to get top IPs by failed attempts
     */
    private getTopIPs(failedLogins: any[], limit: number) {
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
     * Helper method to identify suspicious user agents
     */
    private getSuspiciousUserAgents(failedLogins: any[]) {
        const suspiciousPatterns = ['bot', 'crawler', 'curl', 'python', 'java'];

        return failedLogins
            .filter(log => log.userAgent &&
                suspiciousPatterns.some(pattern =>
                    log.userAgent.toLowerCase().includes(pattern)
                )
            )
            .reduce((acc, log) => {
                acc[log.userAgent] = (acc[log.userAgent] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
    }

    /**
     * Helper method to get hourly distribution of failed logins
     */
    private getHourlyDistribution(failedLogins: any[]) {
        const hourCounts = Array(24).fill(0);

        failedLogins.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hourCounts[hour]++;
        });

        return hourCounts.map((count, hour) => ({ hour, count }));
    }
}