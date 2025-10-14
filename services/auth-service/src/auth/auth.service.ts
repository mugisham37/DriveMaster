import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { User } from './entities/user.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { TokenService, TokenPair } from './services/token.service';
import { PasswordService } from './services/password.service';
import { AuditLoggingService, AuditAction } from './services/audit-logging.service';
import { SessionManagementService } from './services/session-management.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { BaseOAuthProfile, OAuthProviderType } from './interfaces/oauth-profile.interface';
import { AccountLinkingService } from './services/account-linking.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly maxFailedAttempts: number;
    private readonly lockoutDurationMinutes: number;

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(OAuthProvider)
        private readonly oauthProviderRepository: Repository<OAuthProvider>,
        private readonly tokenService: TokenService,
        private readonly passwordService: PasswordService,
        private readonly accountLinkingService: AccountLinkingService,
        private readonly auditLoggingService: AuditLoggingService,
        private readonly sessionManagementService: SessionManagementService,
        private readonly configService: ConfigService,
    ) {
        this.maxFailedAttempts = this.configService.get<number>('MAX_FAILED_ATTEMPTS', 5);
        this.lockoutDurationMinutes = this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 30);
    }

    /**
     * Register a new user with email and password
     */
    async register(registerDto: RegisterDto, ipAddress: string, userAgent: string): Promise<TokenPair> {
        const { email, password, countryCode, timezone = 'UTC', language = 'en' } = registerDto;

        try {
            // Check if user already exists
            const existingUser = await this.userRepository.findOne({ where: { email } });
            if (existingUser) {
                await this.auditLoggingService.logRegistrationAttempt(
                    email,
                    ipAddress,
                    userAgent,
                    false,
                    undefined,
                    { reason: 'email_already_exists' },
                );
                throw new ConflictException('User with this email already exists');
            }

            // Validate password strength
            const passwordValidation = this.passwordService.validatePasswordStrength(password);
            if (!passwordValidation.isValid) {
                await this.auditLoggingService.logRegistrationAttempt(
                    email,
                    ipAddress,
                    userAgent,
                    false,
                    undefined,
                    { reason: 'weak_password', errors: passwordValidation.errors },
                );
                throw new BadRequestException({
                    message: 'Password does not meet requirements',
                    errors: passwordValidation.errors,
                });
            }

            // Hash password
            const hashedPassword = await this.passwordService.hashPassword(password);

            // Create user
            const user = this.userRepository.create({
                email,
                hashedPassword,
                countryCode,
                timezone,
                language,
                emailVerified: false, // Will be verified via email
            });

            const savedUser = await this.userRepository.save(user);

            // Create session
            const sessionId = await this.sessionManagementService.createSession(
                savedUser.id,
                savedUser.email,
                ipAddress,
                userAgent,
            );

            // Log successful registration
            await this.auditLoggingService.logRegistrationAttempt(
                email,
                ipAddress,
                userAgent,
                true,
                savedUser.id,
                { sessionId },
            );

            this.logger.log(`New user registered: ${email}`);

            // Generate tokens
            return this.tokenService.generateTokenPair(
                savedUser.id,
                savedUser.email,
                savedUser.countryCode,
                savedUser.mfaEnabled,
            );
        } catch (error) {
            if (!(error instanceof ConflictException) && !(error instanceof BadRequestException)) {
                await this.auditLoggingService.logRegistrationAttempt(
                    email,
                    ipAddress,
                    userAgent,
                    false,
                    undefined,
                    { reason: 'internal_error', error: error.message },
                );
            }
            throw error;
        }
    }

    /**
     * Login with email and password
     */
    async login(loginDto: LoginDto, ipAddress: string, userAgent: string): Promise<TokenPair> {
        const { email, password } = loginDto;

        try {
            const user = await this.userRepository.findOne({ where: { email, isActive: true } });
            if (!user) {
                await this.auditLoggingService.logLoginAttempt(
                    email,
                    ipAddress,
                    userAgent,
                    false,
                    undefined,
                    { reason: 'user_not_found' },
                );
                throw new UnauthorizedException('Invalid credentials');
            }

            // Check if account is locked
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                const remainingMinutes = Math.ceil(
                    (user.lockedUntil.getTime() - Date.now()) / (1000 * 60),
                );

                await this.auditLoggingService.logLoginAttempt(
                    email,
                    ipAddress,
                    userAgent,
                    false,
                    user.id,
                    { reason: 'account_locked', remainingMinutes },
                );

                throw new UnauthorizedException(
                    `Account is locked. Try again in ${remainingMinutes} minutes.`,
                );
            }

            // Verify password
            if (!user.hashedPassword) {
                await this.auditLoggingService.logLoginAttempt(
                    email,
                    ipAddress,
                    userAgent,
                    false,
                    user.id,
                    { reason: 'password_login_not_available' },
                );
                throw new UnauthorizedException('Password login not available for this account');
            }

            const isPasswordValid = await this.passwordService.verifyPassword(
                user.hashedPassword,
                password,
            );

            if (!isPasswordValid) {
                await this.handleFailedLogin(user, ipAddress, userAgent);
                await this.auditLoggingService.logLoginAttempt(
                    email,
                    ipAddress,
                    userAgent,
                    false,
                    user.id,
                    { reason: 'invalid_password', failedAttempts: user.failedLoginAttempts + 1 },
                );
                throw new UnauthorizedException('Invalid credentials');
            }

            // Reset failed attempts on successful login
            if (user.failedLoginAttempts > 0) {
                user.failedLoginAttempts = 0;
                user.lockedUntil = null;
                await this.userRepository.save(user);
            }

            // Create session
            const sessionId = await this.sessionManagementService.createSession(
                user.id,
                user.email,
                ipAddress,
                userAgent,
            );

            // Log successful login
            await this.auditLoggingService.logLoginAttempt(
                email,
                ipAddress,
                userAgent,
                true,
                user.id,
                { sessionId },
            );

            this.logger.log(`User logged in: ${email}`);

            return this.tokenService.generateTokenPair(
                user.id,
                user.email,
                user.countryCode,
                user.mfaEnabled,
            );
        } catch (error) {
            if (!(error instanceof UnauthorizedException)) {
                await this.auditLoggingService.logLoginAttempt(
                    email,
                    ipAddress,
                    userAgent,
                    false,
                    undefined,
                    { reason: 'internal_error', error: error.message },
                );
            }
            throw error;
        }
    }

    /**
     * Handle OAuth login/registration for any provider
     */
    async handleOAuthLogin(
        provider: OAuthProviderType,
        profile: BaseOAuthProfile,
        accessToken: string,
        ipAddress: string,
        userAgent: string,
        refreshToken?: string,
    ): Promise<TokenPair> {
        // Check if OAuth provider already exists
        let oauthProvider = await this.oauthProviderRepository.findOne({
            where: { provider, providerUserId: profile.id },
            relations: ['user'],
        });

        let user: User;

        if (oauthProvider) {
            // Existing OAuth connection
            user = oauthProvider.user;

            // Update tokens
            await this.accountLinkingService.updateProviderTokens(
                user.id,
                provider,
                accessToken,
                refreshToken,
            );
        } else {
            // Check if user exists with same email
            user = await this.userRepository.findOne({
                where: { email: profile.email, isActive: true }
            });

            if (user) {
                // Link OAuth provider to existing user
                await this.accountLinkingService.linkAccount({
                    userId: user.id,
                    provider,
                    profile,
                    accessToken,
                    refreshToken,
                });
            } else {
                // Create new user
                user = this.userRepository.create({
                    email: profile.email,
                    emailVerified: profile.verified,
                    countryCode: this.inferCountryFromProvider(provider), // Smart default
                    hashedPassword: null, // OAuth-only user
                });
                const savedUser = await this.userRepository.save(user);

                // Link OAuth provider to new user
                await this.accountLinkingService.linkAccount({
                    userId: savedUser.id,
                    provider,
                    profile,
                    accessToken,
                    refreshToken,
                });

                user = savedUser;
            }
        }

        // Update last active timestamp
        user.lastActiveAt = new Date();
        await this.userRepository.save(user);

        // Create session
        const sessionId = await this.sessionManagementService.createSession(
            user.id,
            user.email,
            ipAddress,
            userAgent,
        );

        // Log OAuth login
        await this.auditLoggingService.logOAuthEvent(
            AuditAction.OAUTH_LOGIN,
            profile.email,
            provider,
            ipAddress,
            userAgent,
            true,
            user.id,
            { sessionId, profileId: profile.id },
        );

        this.logger.log(`OAuth login: ${profile.email} via ${provider}`);

        return this.tokenService.generateTokenPair(
            user.id,
            user.email,
            user.countryCode,
            user.mfaEnabled,
        );
    }

    /**
     * Link an OAuth provider to an existing authenticated user
     */
    async linkOAuthProvider(
        userId: string,
        provider: OAuthProviderType,
        profile: BaseOAuthProfile,
        accessToken: string,
        refreshToken?: string,
    ): Promise<void> {
        await this.accountLinkingService.linkAccount({
            userId,
            provider,
            profile,
            accessToken,
            refreshToken,
        });

        this.logger.log(`Linked ${provider} to user ${userId}`);
    }

    /**
     * Unlink an OAuth provider from a user
     */
    async unlinkOAuthProvider(userId: string, provider: OAuthProviderType): Promise<void> {
        await this.accountLinkingService.unlinkAccount({ userId, provider });
        this.logger.log(`Unlinked ${provider} from user ${userId}`);
    }

    /**
     * Get linked OAuth providers for a user
     */
    async getLinkedProviders(userId: string): Promise<OAuthProviderType[]> {
        return this.accountLinkingService.getLinkedProviders(userId);
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
        return this.tokenService.refreshTokens(refreshToken);
    }

    /**
     * Logout user by revoking refresh tokens
     */
    async logout(userId: string, ipAddress: string, userAgent: string): Promise<void> {
        // Get user for audit logging
        const user = await this.userRepository.findOne({ where: { id: userId } });

        // Revoke all tokens
        await this.tokenService.revokeAllUserTokens(userId);

        // Invalidate all sessions
        await this.sessionManagementService.invalidateAllUserSessions(userId);

        // Log logout
        if (user) {
            await this.auditLoggingService.logAuthEvent({
                userId,
                email: user.email,
                ipAddress,
                userAgent,
                action: AuditAction.LOGOUT,
                outcome: 'success',
                timestamp: new Date(),
                riskScore: 0.1,
            });
        }

        this.logger.log(`User logged out: ${userId}`);
    }

    /**
     * Handle failed login attempt
     */
    private async handleFailedLogin(user: User, ipAddress: string, userAgent: string): Promise<void> {
        user.failedLoginAttempts += 1;

        if (user.failedLoginAttempts >= this.maxFailedAttempts) {
            user.lockedUntil = new Date(Date.now() + this.lockoutDurationMinutes * 60 * 1000);

            // Log account lockout
            await this.auditLoggingService.logAccountLockout(
                user.id,
                user.email,
                ipAddress,
                'max_failed_attempts_exceeded',
                {
                    failedAttempts: user.failedLoginAttempts,
                    lockoutDurationMinutes: this.lockoutDurationMinutes,
                    userAgent,
                },
            );

            this.logger.warn(`Account locked due to failed attempts: ${user.email}`);
        }

        await this.userRepository.save(user);
    }

    /**
     * Infer country code from OAuth provider (smart defaults)
     */
    private inferCountryFromProvider(provider: OAuthProviderType): string {
        // This could be enhanced with IP geolocation or user preference detection
        const providerDefaults: Record<OAuthProviderType, string> = {
            google: 'US',
            apple: 'US',
            facebook: 'US',
            github: 'US',
            microsoft: 'US',
        };

        return providerDefaults[provider] || 'US';
    }
}