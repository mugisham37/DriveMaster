import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { SecurityMiddleware, InputValidationMiddleware, AuditMiddleware } from './security.middleware';
import { InputValidationService } from './input-validation.service';
import { EncryptionService } from './encryption.service';
import { AuditService } from './audit.service';

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