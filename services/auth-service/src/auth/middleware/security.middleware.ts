import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionManagementService } from '../services/session-management.service';
import { AuditLoggingService } from '../services/audit-logging.service';
import { RateLimitingService } from '../services/rate-limiting.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
    private readonly logger = new Logger(SecurityMiddleware.name);

    constructor(
        private readonly sessionManagementService: SessionManagementService,
        private readonly auditLoggingService: AuditLoggingService,
        private readonly rateLimitingService: RateLimitingService,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const ipAddress = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || 'unknown';

        try {
            // Detect suspicious patterns
            await this.detectSuspiciousActivity(req, ipAddress, userAgent);

            // Add security headers
            this.addSecurityHeaders(res);

            // Update session activity if user is authenticated
            await this.updateSessionActivity(req, ipAddress, userAgent);

            next();
        } catch (error) {
            this.logger.error('Security middleware error', error);
            next(); // Continue on error to avoid blocking legitimate requests
        }
    }

    /**
     * Detect suspicious activity patterns
     */
    private async detectSuspiciousActivity(req: Request, ipAddress: string, userAgent: string): Promise<void> {
        const suspiciousPatterns = [];

        // Check for suspicious user agents
        if (this.isSuspiciousUserAgent(userAgent)) {
            suspiciousPatterns.push('suspicious_user_agent');
        }

        // Check for rapid requests (basic bot detection)
        if (await this.isRapidRequests(ipAddress)) {
            suspiciousPatterns.push('rapid_requests');
        }

        // Check for unusual request patterns
        if (this.hasUnusualRequestPattern(req)) {
            suspiciousPatterns.push('unusual_request_pattern');
        }

        // Check for SQL injection attempts
        if (this.hasSQLInjectionAttempt(req)) {
            suspiciousPatterns.push('sql_injection_attempt');
        }

        // Check for XSS attempts
        if (this.hasXSSAttempt(req)) {
            suspiciousPatterns.push('xss_attempt');
        }

        // Record suspicious activity if patterns detected
        if (suspiciousPatterns.length > 0) {
            const userId = this.getUserId(req);

            await this.rateLimitingService.recordSuspiciousActivity(
                ipAddress,
                userId,
                suspiciousPatterns.join(', '),
                {
                    userAgent,
                    path: req.path,
                    method: req.method,
                    patterns: suspiciousPatterns,
                    headers: this.sanitizeHeaders(req.headers),
                },
            );

            this.logger.warn(`Suspicious activity detected from IP ${ipAddress}`, {
                patterns: suspiciousPatterns,
                userAgent,
                path: req.path,
                userId,
            });
        }
    }

    /**
     * Check if user agent looks suspicious
     */
    private isSuspiciousUserAgent(userAgent: string): boolean {
        const suspiciousPatterns = [
            /bot/i,
            /crawler/i,
            /spider/i,
            /scraper/i,
            /curl/i,
            /wget/i,
            /python/i,
            /java/i,
            /go-http-client/i,
            /^$/,
            /unknown/i,
        ];

        // Allow legitimate bots (Google, Bing, etc.)
        const legitimateBots = [
            /googlebot/i,
            /bingbot/i,
            /slurp/i,
            /duckduckbot/i,
            /baiduspider/i,
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
        const isLegitimate = legitimateBots.some(pattern => pattern.test(userAgent));

        return isSuspicious && !isLegitimate;
    }

    /**
     * Check for rapid requests from same IP
     */
    private async isRapidRequests(ipAddress: string): Promise<boolean> {
        // This is a simplified check - in production, you'd want more sophisticated logic
        const key = `rapid_check:${ipAddress}`;
        const count = await this.rateLimitingService['redis'].incr(key);

        if (count === 1) {
            await this.rateLimitingService['redis'].expire(key, 10); // 10 second window
        }

        return count > 20; // More than 20 requests in 10 seconds
    }

    /**
     * Check for unusual request patterns
     */
    private hasUnusualRequestPattern(req: Request): boolean {
        // Check for unusual headers
        const suspiciousHeaders = ['x-forwarded-host', 'x-originating-ip', 'x-remote-ip'];
        const hasSuspiciousHeaders = suspiciousHeaders.some(header => req.get(header));

        // Check for unusual query parameters
        const queryString = req.url.split('?')[1] || '';
        const hasLongQuery = queryString.length > 1000;
        const hasManyParams = Object.keys(req.query).length > 50;

        return hasSuspiciousHeaders || hasLongQuery || hasManyParams;
    }

    /**
     * Check for SQL injection attempts
     */
    private hasSQLInjectionAttempt(req: Request): boolean {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
            /(\'|\"|;|--|\*|\|)/,
            /(\bOR\b|\bAND\b).*(\=|\<|\>)/i,
            /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/i,
        ];

        const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + req.url;

        return sqlPatterns.some(pattern => pattern.test(checkString));
    }

    /**
     * Check for XSS attempts
     */
    private hasXSSAttempt(req: Request): boolean {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i,
            /eval\s*\(/i,
            /expression\s*\(/i,
        ];

        const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + req.url;

        return xssPatterns.some(pattern => pattern.test(checkString));
    }

    /**
     * Add security headers to response
     */
    private addSecurityHeaders(res: Response): void {
        res.set({
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        });
    }

    /**
     * Update session activity for authenticated users
     */
    private async updateSessionActivity(req: Request, ipAddress: string, userAgent: string): Promise<void> {
        const user = (req as any).user;
        if (!user) return;

        const sessionId = user.sessionId || user.sub; // Fallback to user ID if no session ID

        await this.sessionManagementService.updateSessionActivity(
            sessionId,
            ipAddress,
            userAgent,
            'api_request',
            {
                path: req.path,
                method: req.method,
            },
        );
    }

    /**
     * Get client IP address
     */
    private getClientIP(req: Request): string {
        const forwarded = req.get('X-Forwarded-For');
        const realIP = req.get('X-Real-IP');
        const cfConnectingIP = req.get('CF-Connecting-IP');

        if (cfConnectingIP) return cfConnectingIP;
        if (realIP) return realIP;
        if (forwarded) return forwarded.split(',')[0].trim();

        return req.socket.remoteAddress || 'unknown';
    }

    /**
     * Get user ID from request
     */
    private getUserId(req: Request): string | undefined {
        const user = (req as any).user;
        return user?.sub || user?.id;
    }

    /**
     * Sanitize headers for logging (remove sensitive information)
     */
    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers };

        // Remove sensitive headers
        delete sanitized.authorization;
        delete sanitized.cookie;
        delete sanitized['x-api-key'];

        return sanitized;
    }
}