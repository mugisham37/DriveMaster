import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { JwtService } from '@nestjs/jwt';
import { UserClaims } from './token.service';

export interface SessionInfo {
    sessionId: string;
    userId: string;
    email: string;
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    lastActiveAt: Date;
    expiresAt: Date;
    isActive: boolean;
    deviceFingerprint?: string;
}

export interface SessionActivity {
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    action: string;
    details?: Record<string, any>;
}

@Injectable()
export class SessionManagementService {
    private readonly logger = new Logger(SessionManagementService.name);
    private readonly sessionTTL: number;
    private readonly slidingWindowMinutes: number;
    private readonly maxConcurrentSessions: number;

    constructor(
        @InjectRedis() private readonly redis: Redis,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
    ) {
        this.sessionTTL = this.configService.get<number>('SESSION_TTL_HOURS', 24) * 60 * 60; // Convert to seconds
        this.slidingWindowMinutes = this.configService.get<number>('SESSION_SLIDING_WINDOW_MINUTES', 30);
        this.maxConcurrentSessions = this.configService.get<number>('MAX_CONCURRENT_SESSIONS', 5);
    }

    /**
     * Create a new session
     */
    async createSession(
        userId: string,
        email: string,
        ipAddress: string,
        userAgent: string,
        deviceFingerprint?: string,
    ): Promise<string> {
        const sessionId = this.generateSessionId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.sessionTTL * 1000);

        const sessionInfo: SessionInfo = {
            sessionId,
            userId,
            email,
            ipAddress,
            userAgent,
            createdAt: now,
            lastActiveAt: now,
            expiresAt,
            isActive: true,
            deviceFingerprint,
        };

        // Store session info
        const sessionKey = `session:${sessionId}`;
        await this.redis.setex(sessionKey, this.sessionTTL, JSON.stringify(sessionInfo));

        // Add to user's active sessions
        const userSessionsKey = `user_sessions:${userId}`;
        await this.redis.sadd(userSessionsKey, sessionId);
        await this.redis.expire(userSessionsKey, this.sessionTTL);

        // Enforce concurrent session limit
        await this.enforceConcurrentSessionLimit(userId);

        // Log session creation
        await this.logSessionActivity(sessionId, {
            timestamp: now,
            ipAddress,
            userAgent,
            action: 'session_created',
            details: { deviceFingerprint },
        });

        this.logger.log(`Session created for user ${userId}: ${sessionId}`);
        return sessionId;
    }

    /**
     * Update session activity (sliding expiration)
     */
    async updateSessionActivity(
        sessionId: string,
        ipAddress: string,
        userAgent: string,
        action: string = 'activity',
        details?: Record<string, any>,
    ): Promise<boolean> {
        const sessionKey = `session:${sessionId}`;
        const sessionData = await this.redis.get(sessionKey);

        if (!sessionData) {
            return false;
        }

        const sessionInfo: SessionInfo = JSON.parse(sessionData);
        const now = new Date();

        // Check if session is still valid
        if (sessionInfo.expiresAt < now || !sessionInfo.isActive) {
            await this.invalidateSession(sessionId);
            return false;
        }

        // Update last activity and extend expiration (sliding window)
        sessionInfo.lastActiveAt = now;
        sessionInfo.expiresAt = new Date(now.getTime() + this.sessionTTL * 1000);

        // Detect suspicious activity (IP or user agent change)
        if (sessionInfo.ipAddress !== ipAddress || sessionInfo.userAgent !== userAgent) {
            await this.logSessionActivity(sessionId, {
                timestamp: now,
                ipAddress,
                userAgent,
                action: 'suspicious_session_change',
                details: {
                    originalIp: sessionInfo.ipAddress,
                    newIp: ipAddress,
                    originalUserAgent: sessionInfo.userAgent,
                    newUserAgent: userAgent,
                    ...details,
                },
            });

            // Optionally invalidate session on suspicious change
            const allowIpChange = this.configService.get<boolean>('ALLOW_SESSION_IP_CHANGE', true);
            if (!allowIpChange) {
                await this.invalidateSession(sessionId);
                return false;
            }

            // Update session with new IP/user agent
            sessionInfo.ipAddress = ipAddress;
            sessionInfo.userAgent = userAgent;
        }

        // Save updated session
        await this.redis.setex(sessionKey, this.sessionTTL, JSON.stringify(sessionInfo));

        // Log activity
        await this.logSessionActivity(sessionId, {
            timestamp: now,
            ipAddress,
            userAgent,
            action,
            details,
        });

        return true;
    }

    /**
     * Get session information
     */
    async getSession(sessionId: string): Promise<SessionInfo | null> {
        const sessionKey = `session:${sessionId}`;
        const sessionData = await this.redis.get(sessionKey);

        if (!sessionData) {
            return null;
        }

        const sessionInfo: SessionInfo = JSON.parse(sessionData);

        // Check if session is expired
        if (sessionInfo.expiresAt < new Date() || !sessionInfo.isActive) {
            await this.invalidateSession(sessionId);
            return null;
        }

        return sessionInfo;
    }

    /**
     * Invalidate a session
     */
    async invalidateSession(sessionId: string): Promise<void> {
        const sessionKey = `session:${sessionId}`;
        const sessionData = await this.redis.get(sessionKey);

        if (sessionData) {
            const sessionInfo: SessionInfo = JSON.parse(sessionData);

            // Remove from user's active sessions
            const userSessionsKey = `user_sessions:${sessionInfo.userId}`;
            await this.redis.srem(userSessionsKey, sessionId);

            // Log session invalidation
            await this.logSessionActivity(sessionId, {
                timestamp: new Date(),
                ipAddress: sessionInfo.ipAddress,
                userAgent: sessionInfo.userAgent,
                action: 'session_invalidated',
            });
        }

        // Delete session data
        await this.redis.del(sessionKey);
        await this.redis.del(`session_activity:${sessionId}`);

        this.logger.log(`Session invalidated: ${sessionId}`);
    }

    /**
     * Invalidate all sessions for a user
     */
    async invalidateAllUserSessions(userId: string): Promise<void> {
        const userSessionsKey = `user_sessions:${userId}`;
        const sessionIds = await this.redis.smembers(userSessionsKey);

        for (const sessionId of sessionIds) {
            await this.invalidateSession(sessionId);
        }

        await this.redis.del(userSessionsKey);
        this.logger.log(`All sessions invalidated for user: ${userId}`);
    }

    /**
     * Get all active sessions for a user
     */
    async getUserSessions(userId: string): Promise<SessionInfo[]> {
        const userSessionsKey = `user_sessions:${userId}`;
        const sessionIds = await this.redis.smembers(userSessionsKey);

        const sessions: SessionInfo[] = [];

        for (const sessionId of sessionIds) {
            const session = await this.getSession(sessionId);
            if (session) {
                sessions.push(session);
            }
        }

        return sessions.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
    }

    /**
     * Get session activity log
     */
    async getSessionActivity(sessionId: string, limit: number = 50): Promise<SessionActivity[]> {
        const activityKey = `session_activity:${sessionId}`;
        const activities = await this.redis.lrange(activityKey, 0, limit - 1);

        return activities.map(activity => JSON.parse(activity));
    }

    /**
     * Validate session from JWT token
     */
    async validateSessionFromToken(token: string): Promise<SessionInfo | null> {
        try {
            const payload = this.jwtService.verify(token) as UserClaims;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const sessionId = payload.sub; // Using user ID as session reference

            // In a more sophisticated implementation, you might store session ID in JWT
            // For now, we'll look up the most recent session for the user
            const sessions = await this.getUserSessions(payload.sub);

            if (sessions.length === 0) {
                return null;
            }

            // Return the most recent active session
            return sessions[0];
        } catch (error) {
            return null;
        }
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions(): Promise<void> {
        // This would typically be run as a scheduled job
        const pattern = 'session:*';
        const keys = await this.redis.keys(pattern);

        let cleanedCount = 0;

        for (const key of keys) {
            const sessionData = await this.redis.get(key);
            if (sessionData) {
                const sessionInfo: SessionInfo = JSON.parse(sessionData);
                if (sessionInfo.expiresAt < new Date()) {
                    const sessionId = key.replace('session:', '');
                    await this.invalidateSession(sessionId);
                    cleanedCount++;
                }
            }
        }

        this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
    }

    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2);
        return `${timestamp}-${randomPart}`;
    }

    /**
     * Enforce concurrent session limit
     */
    private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
        const sessions = await this.getUserSessions(userId);

        if (sessions.length > this.maxConcurrentSessions) {
            // Sort by last activity and remove oldest sessions
            const sessionsToRemove = sessions
                .sort((a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime())
                .slice(0, sessions.length - this.maxConcurrentSessions);

            for (const session of sessionsToRemove) {
                await this.invalidateSession(session.sessionId);
            }

            this.logger.log(`Enforced session limit for user ${userId}, removed ${sessionsToRemove.length} old sessions`);
        }
    }

    /**
     * Log session activity
     */
    private async logSessionActivity(sessionId: string, activity: SessionActivity): Promise<void> {
        const activityKey = `session_activity:${sessionId}`;

        // Store activity (keep last 100 activities)
        await this.redis.lpush(activityKey, JSON.stringify(activity));
        await this.redis.ltrim(activityKey, 0, 99);
        await this.redis.expire(activityKey, this.sessionTTL);
    }
}