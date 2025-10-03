import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthController } from './auth.controller';
import { SecurityAdminController } from './controllers/security-admin.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { GitHubStrategy } from './strategies/github.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { User } from './entities/user.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditLog } from './services/audit-logging.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { OAuthStateService } from './services/oauth-state.service';
import { AccountLinkingService } from './services/account-linking.service';
import { OAuthService } from './services/oauth.service';
import { AuditLoggingService } from './services/audit-logging.service';
import { RateLimitingService } from './services/rate-limiting.service';
import { SessionManagementService } from './services/session-management.service';
import { CleanupService } from './services/cleanup.service';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { SecurityMiddleware } from './middleware/security.middleware';

@Module({
    imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
                },
            }),
            inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User, OAuthProvider, RefreshToken, AuditLog]),
    ],
    controllers: [AuthController, SecurityAdminController],
    providers: [
        AuthService,
        TokenService,
        PasswordService,
        OAuthStateService,
        AccountLinkingService,
        OAuthService,
        AuditLoggingService,
        RateLimitingService,
        SessionManagementService,
        CleanupService,
        RateLimitMiddleware,
        SecurityMiddleware,
        JwtStrategy,
        JwtRefreshStrategy,
        GoogleStrategy,
        AppleStrategy,
        FacebookStrategy,
        GitHubStrategy,
        MicrosoftStrategy,
    ],
    exports: [AuthService, TokenService, AuditLoggingService, RateLimitingService, SessionManagementService],
})
export class AuthModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RateLimitMiddleware)
            .forRoutes('auth/login', 'auth/register', 'auth/refresh', 'auth/mfa/verify');

        consumer
            .apply(SecurityMiddleware)
            .forRoutes('*');
    }
}