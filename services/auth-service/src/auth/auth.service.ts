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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleProfile } from './strategies/google.strategy';
import { AppleProfile } from './strategies/apple.strategy';
import { FacebookProfile } from './strategies/facebook.strategy';
import { GitHubProfile } from './strategies/github.strategy';
import { MicrosoftProfile } from './strategies/microsoft.strategy';
import { BaseOAuthProfile, OAuthProvider as OAuthProviderType } from './interfaces/oauth-profile.interface';
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
        private readonly configService: ConfigService,
    ) {
        this.maxFailedAttempts = this.configService.get<number>('MAX_FAILED_ATTEMPTS', 5);
        this.lockoutDurationMinutes = this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 30);
    }

    /**
     * Register a new user with email and password
     */
    async register(registerDto: RegisterDto): Promise<TokenPair> {
        const { email, password, countryCode, timezone = 'UTC', language = 'en' } = registerDto;

        // Check if user already exists
        const existingUser = await this.userRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Validate password strength
        const passwordValidation = this.passwordService.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
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

        this.logger.log(`New user registered: ${email}`);

        // Generate tokens
        return this.tokenService.generateTokenPair(
            savedUser.id,
            savedUser.email,
            savedUser.countryCode,
            savedUser.mfaEnabled,
        );
    }

    /**
     * Login with email and password
     */
    async login(loginDto: LoginDto): Promise<TokenPair> {
        const { email, password } = loginDto;

        const user = await this.userRepository.findOne({ where: { email, isActive: true } });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingMinutes = Math.ceil(
                (user.lockedUntil.getTime() - Date.now()) / (1000 * 60),
            );
            throw new UnauthorizedException(
                `Account is locked. Try again in ${remainingMinutes} minutes.`,
            );
        }

        // Verify password
        if (!user.hashedPassword) {
            throw new UnauthorizedException('Password login not available for this account');
        }

        const isPasswordValid = await this.passwordService.verifyPassword(
            user.hashedPassword,
            password,
        );

        if (!isPasswordValid) {
            await this.handleFailedLogin(user);
            throw new UnauthorizedException('Invalid credentials');
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts > 0) {
            user.failedLoginAttempts = 0;
            user.lockedUntil = null;
            await this.userRepository.save(user);
        }

        this.logger.log(`User logged in: ${email}`);

        return this.tokenService.generateTokenPair(
            user.id,
            user.email,
            user.countryCode,
            user.mfaEnabled,
        );
    }

    /**
     * Handle OAuth login/registration for any provider
     */
    async handleOAuthLogin(
        provider: OAuthProviderType,
        profile: BaseOAuthProfile,
        accessToken: string,
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
    async logout(userId: string): Promise<void> {
        await this.tokenService.revokeAllUserTokens(userId);
        this.logger.log(`User logged out: ${userId}`);
    }

    /**
     * Handle failed login attempt
     */
    private async handleFailedLogin(user: User): Promise<void> {
        user.failedLoginAttempts += 1;

        if (user.failedLoginAttempts >= this.maxFailedAttempts) {
            user.lockedUntil = new Date(Date.now() + this.lockoutDurationMinutes * 60 * 1000);
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