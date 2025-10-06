import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
    private readonly logger = new Logger(SecurityMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        // Add security headers
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    fontSrc: ["'self'", "data:"],
                    connectSrc: ["'self'"],
                    frameAncestors: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        })(req, res, () => { });

        // Add custom security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        // Remove server information
        res.removeHeader('X-Powered-By');

        // Generate request ID if not present
        if (!req.headers['x-request-id']) {
            req.headers['x-request-id'] = this.generateRequestId();
        }
        res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);

        // Log security-relevant information
        this.logger.debug(`Security middleware applied for ${req.method} ${req.path}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            requestId: req.headers['x-request-id']
        });

        next();
    }

    private generateRequestId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Rate limiting middleware factory
export const createRateLimitMiddleware = (windowMs: number, max: number, message?: string) => {
    return rateLimit({
        windowMs,
        max,
        message: message || 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            const logger = new Logger('RateLimit');
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path
            });
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded',
                retryAfter: Math.round(windowMs / 1000)
            });
        }
    });
};

// Input validation middleware
@Injectable()
export class InputValidationMiddleware implements NestMiddleware {
    private readonly logger = new Logger(InputValidationMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        // Validate and sanitize common attack vectors
        if (this.containsSuspiciousPatterns(req)) {
            this.logger.warn('Suspicious request detected', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method
            });

            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid request content'
            });
        }

        // Validate request size
        const contentLength = parseInt(req.get('content-length') || '0');
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (contentLength > maxSize) {
            this.logger.warn('Request size too large', {
                ip: req.ip,
                contentLength,
                maxSize
            });

            return res.status(413).json({
                error: 'Payload Too Large',
                message: 'Request size exceeds limit'
            });
        }

        next();
    }

    private containsSuspiciousPatterns(req: Request): boolean {
        const suspiciousPatterns = [
            // SQL injection patterns
            /(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b|\binsert\b.*\binto\b|\bupdate\b.*\bset\b|\bdelete\b.*\bfrom\b)/i,
            /(\bdrop\b.*\btable\b|\bcreate\b.*\btable\b|\balter\b.*\btable\b|\btruncate\b.*\btable\b)/i,
            /(exec\s*\(|execute\s*\(|sp_executesql)/i,
            /(\-\-|\#|\/\*|\*\/)/,

            // XSS patterns
            /<script[^>]*>.*?<\/script>/i,
            /<iframe[^>]*>.*?<\/iframe>/i,
            /<object[^>]*>.*?<\/object>/i,
            /javascript:|vbscript:|data:|about:/i,
            /on\w+\s*=/i,

            // Path traversal patterns
            /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c|%252e%252e%252f|%252e%252e%255c/i
        ];

        // Check URL, query parameters, and headers
        const checkString = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.headers)}`;

        return suspiciousPatterns.some(pattern => pattern.test(checkString));
    }
}

// Audit logging middleware
@Injectable()
export class AuditMiddleware implements NestMiddleware {
    private readonly logger = new Logger(AuditMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        const startTime = Date.now();

        // Capture original end function
        const originalEnd = res.end;

        res.end = function (chunk?: any, encoding?: any) {
            const duration = Date.now() - startTime;

            // Log audit information
            const auditLog = {
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                clientIp: req.ip,
                userAgent: req.get('User-Agent'),
                requestId: req.headers['x-request-id'],
                userId: (req as any).user?.id, // Set by auth middleware
                contentLength: res.get('content-length'),
                referer: req.get('Referer')
            };

            // Log based on status code and risk level
            if (res.statusCode >= 500) {
                this.logger.error('Server error', auditLog);
            } else if (res.statusCode >= 400) {
                this.logger.warn('Client error', auditLog);
            } else if (req.path.includes('/auth/') || req.path.includes('/admin/')) {
                this.logger.log('Security-sensitive request', auditLog);
            } else {
                this.logger.debug('Request completed', auditLog);
            }

            // Call original end function
            originalEnd.call(this, chunk, encoding);
        };

        next();
    }
}