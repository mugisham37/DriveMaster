import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from './entities/user.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';

@Module({
    imports: [
        ConfigModule,
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
        TypeOrmModule.forFeature([User, OAuthProvider, RefreshToken]),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        TokenService,
        PasswordService,
        JwtStrategy,
        JwtRefreshStrategy,
        GoogleStrategy,
    ],
    exports: [AuthService, TokenService],
})
export class AuthModule { }