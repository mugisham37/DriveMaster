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
     * Handle OAuth login/registration
     */
    async handleOAuthLogin(
        provider: string,
        profile: GoogleProfile,
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
            oauthProvider.accessTokenHash = await this.hashToken(accessToken);
            if (refreshToken) {
                oauthProvider.refreshTokenHash = await this.hashToken(refreshToken);
            }
            await this.oauthProviderRepository.save(oauthProvider);
        } else {
            // Check if user exists with same email
            user = await this.userRepository.findOne({ where: { email: profile.email } });

            if (user) {
                // Link OAuth provider to existing user
                oauthProvider = this.oauthProviderRepository.create({
                    userId: user.id,
                    provider,
                    providerUserId: profile.id,
                    accessTokenHash: await this.hashToken(accessToken),
                    refreshTokenHash: refreshToken ? await this.hashToken(refreshToken) : null,
                });
                await this.oauthProviderRepository.save(oauthProvider);
            } else {
                // Create new user
                user = this.userRepository.create({
                    email: profile.email,
                    emailVerified: profile.verified,
                    countryCode: 'US', // Default, can be updated later
                    hashedPassword: null, // OAuth-only user
                });
                const savedUser = await this.userRepository.save(user);

                // Create OAuth provider record
                oauthProvider = this.oauthProviderRepository.create({
                    userId: savedUser.id,
                    provider,
                    providerUserId: profile.id,
                    accessTokenHash: await this.hashToken(accessToken),
                    refreshTokenHash: refreshToken ? await this.hashToken(refreshToken) : null,
                });
                await this.oauthProviderRepository.save(oauthProvider);

                user = savedUser;
            }
        }

        this.logger.log(`OAuth login: ${profile.email} via ${provider}`);

        return this.tokenService.generateTokenPair(
            user.id,
            user.email,
            user.countryCode,
            user.mfaEnabled,
        );
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
     * Hash OAuth tokens for secure storage
     */
    private async hashToken(token: string): Promise<string> {
        return this.passwordService.hashPassword(token);
    }
}