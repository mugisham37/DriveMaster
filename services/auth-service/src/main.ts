import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { createRateLimitMiddleware } from './security/security.middleware';
import compression from 'compression';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose']
    });

    // Enable trust proxy for accurate IP addresses
    app.getHttpAdapter().getInstance().set('trust proxy', 1);

    // Enable compression
    app.use(compression());

    // Global validation pipe with enhanced security
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
        validateCustomDecorators: true,
        transformOptions: {
            enableImplicitConversion: false,
        },
    }));

    // Enhanced CORS configuration
    app.enableCors({
        origin: (origin, callback) => {
            const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            logger.warn(`CORS blocked origin: ${origin}`);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Request-ID'],
        exposedHeaders: ['X-Request-ID'],
        maxAge: 86400, // 24 hours
    });

    // Rate limiting for authentication endpoints
    app.use('/auth/login', createRateLimitMiddleware(15 * 60 * 1000, 5)); // 5 attempts per 15 minutes
    app.use('/auth/register', createRateLimitMiddleware(60 * 60 * 1000, 3)); // 3 attempts per hour
    app.use('/auth/forgot-password', createRateLimitMiddleware(60 * 60 * 1000, 3)); // 3 attempts per hour
    app.use('/auth/reset-password', createRateLimitMiddleware(15 * 60 * 1000, 5)); // 5 attempts per 15 minutes

    // Global rate limiting
    app.use(createRateLimitMiddleware(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.log('SIGTERM received, shutting down gracefully');
        await app.close();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        logger.log('SIGINT received, shutting down gracefully');
        await app.close();
        process.exit(0);
    });

    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log(`Auth service running on port ${port}`);
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Security features enabled: encryption, audit logging, input validation, rate limiting`);
}

bootstrap().catch(error => {
    const logger = new Logger('Bootstrap');
    logger.error('Failed to start application', error);
    process.exit(1);
});