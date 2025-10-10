import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { SecurityMiddleware, InputValidationMiddleware, AuditMiddleware } from './security.middleware.js';
import { InputValidationService } from './input-validation.service.js';
import { EncryptionService } from './encryption.service.js';
import { AuditService } from './audit.service.js';

@Module({
    providers: [
        InputValidationService,
        EncryptionService,
        AuditService,
        SecurityMiddleware,
        InputValidationMiddleware,
        AuditMiddleware,
    ],
    exports: [
        InputValidationService,
        EncryptionService,
        AuditService,
    ],
})
export class SecurityModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(SecurityMiddleware, InputValidationMiddleware, AuditMiddleware)
            .forRoutes('*');
    }
}