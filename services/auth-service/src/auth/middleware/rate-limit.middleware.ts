import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitingService } from '../services/rate-limiting.service';
import { AuditLoggingService } from '../services/audit-logging.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
    private readonly logger = new Logger(RateLimitMiddleware.name);

    constructor(
        private readonly rateLimitingService: RateLimitingService,
        private readonly auditLoggingService: AuditLoggingService,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const ipAddress = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || 'unknown';
        const endpoint = this.getEndpointName(req);
        const userId = this.getUserId(req);

        try {
            // Check if IP is blocked for suspicious activity
            const isSuspiciouslyBlocked = await this.rateLimitingService.isSuspiciouslyBlocked(ipAddress);
            if (isSuspiciouslyBlocked) {
                await this.auditLoggingService.logSuspiciousActivity(
                    ipAddress,
                    'blocked_request_attempt',
                    userId,
                    undefined,
                    userAgent,
                    { endpoint, reason: 'suspicious_activity_block' },
                );

                throw new HttpException(
                    {
                        message: 'Access temporarily blocked due to suspicious activity',
                        code: 'SUSPICIOUS_ACTIVITY_BLOCKED',
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            // Check rate limit
            const rateLimitResult = await this.rateLimitingService.checkRateLimit(
                ipAddress,
                endpoint,
                userId,
            );

            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': '100', // This should be dynamic based on endpoint
                'X-RateLimit-Remaining': rateLimitResult.remainingRequests.toString(),
                'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            });

            if (!rateLimitResult.allowed) {
                // Log rate limit exceeded
                await this.auditLoggingService.logRateLimitExceeded(
                    ipAddress,
                    endpoint,
                    userId,
                    undefined,
                    userAgent,
                );

                const errorResponse = {
                    message: rateLimitResult.blocked
                        ? 'IP address is temporarily blocked due to rate limit violations'
                        : 'Rate limit exceeded. Please try again later.',
                    code: rateLimitResult.blocked ? 'IP_BLOCKED' : 'RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
                };

                if (rateLimitResult.blockExpiresAt) {
                    res.set('Retry-After', Math.ceil((rateLimitResult.blockExpiresAt - Date.now()) / 1000).toString());
                }

                throw new HttpException(errorResponse, HttpStatus.TOO_MANY_REQUESTS);
            }

            next();
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error('Rate limiting middleware error', error);
            next(); // Continue on error to avoid blocking legitimate requests
        }
    }

    /**
     * Get client IP address, considering proxies
     */
    private getClientIP(req: Request): string {
        const forwarded = req.get('X-Forwarded-For');
        const realIP = req.get('X-Real-IP');
        const cfConnectingIP = req.get('CF-Connecting-IP'); // Cloudflare

        if (cfConnectingIP) return cfConnectingIP;
        if (realIP) return realIP;
        if (forwarded) return forwarded.split(',')[0].trim();

        return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    }

    /**
     * Extract endpoint name for rate limiting
     */
    private getEndpointName(req: Request): string {
        const path = req.path.toLowerCase();
        const method = req.method.toLowerCase();

        // Map specific endpoints to rate limit categories
        if (path.includes('/auth/login')) return 'login';
        if (path.includes('/auth/register')) return 'register';
        if (path.includes('/auth/refresh')) return 'token-refresh';
        if (path.includes('/auth/mfa/verify')) return 'mfa-verify';
        if (path.includes('/auth/password/reset')) return 'password-reset';
        if (path.includes('/auth/oauth/')) return 'oauth';

        // Default to global rate limiting
        return 'global';
    }

    /**
     * Extract user ID from request (if authenticated)
     */
    private getUserId(req: Request): string | undefined {
        // This would typically come from JWT token in Authorization header
        const user = (req as any).user;
        return user?.sub || user?.id;
    }
}