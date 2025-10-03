import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';
import { BaseOAuthProfile, OAuthProvider as OAuthProviderType } from '../interfaces/oauth-profile.interface';
import { PasswordService } from './password.service';

export interface LinkAccountDto {
    userId: string;
    provider: OAuthProviderType;
    profile: BaseOAuthProfile;
    accessToken: string;
    refreshToken?: string;
}

export interface UnlinkAccountDto {
    userId: string;
    provider: OAuthProviderType;
}

@Injectable()
export class AccountLinkingService {
    private readonly logger = new Logger(AccountLinkingService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(OAuthProvider)
        private readonly oauthProviderRepository: Repository<OAuthProvider>,
        private readonly passwordService: PasswordService,
    ) { }

    /**
     * Link an OAuth provider to an existing user account
     */
    async linkAccount(linkDto: LinkAccountDto): Promise<void> {
        const { userId, provider, profile, accessToken, refreshToken } = linkDto;

        // Verify user exists
        const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if this OAuth provider is already linked to this user
        const existingLink = await this.oauthProviderRepository.findOne({
            where: { userId, provider },
        });

        if (existingLink) {
            throw new ConflictException(`${provider} account is already linked to this user`);
        }

        // Check if this OAuth provider is linked to another user
        const existingProvider = await this.oauthProviderRepository.findOne({
            where: { provider, providerUserId: profile.id },
            relations: ['user'],
        });

        if (existingProvider && existingProvider.userId !== userId) {
            throw new ConflictException(
                `This ${provider} account is already linked to another user`,
            );
        }

        // Check for email conflicts
        if (profile.email && profile.email !== user.email) {
            const emailConflictUser = await this.userRepository.findOne({
                where: { email: profile.email, isActive: true },
            });

            if (emailConflictUser && emailConflictUser.id !== userId) {
                throw new ConflictException(
                    'This OAuth account email is already associated with another user',
                );
            }
        }

        // Create OAuth provider link
        const oauthProvider = this.oauthProviderRepository.create({
            userId,
            provider,
            providerUserId: profile.id,
            accessTokenHash: await this.passwordService.hashPassword(accessToken),
            refreshTokenHash: refreshToken
                ? await this.passwordService.hashPassword(refreshToken)
                : null,
        });

        await this.oauthProviderRepository.save(oauthProvider);

        // Update user email verification if OAuth email is verified
        if (profile.email && profile.verified && !user.emailVerified) {
            user.emailVerified = true;
            await this.userRepository.save(user);
        }

        this.logger.log(`Linked ${provider} account to user ${userId}`);
    }

    /**
     * Unlink an OAuth provider from a user account
     */
    async unlinkAccount(unlinkDto: UnlinkAccountDto): Promise<void> {
        const { userId, provider } = unlinkDto;

        // Verify user exists
        const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Find the OAuth provider link
        const oauthProvider = await this.oauthProviderRepository.findOne({
            where: { userId, provider },
        });

        if (!oauthProvider) {
            throw new NotFoundException(`${provider} account is not linked to this user`);
        }

        // Check if user has other authentication methods
        const otherProviders = await this.oauthProviderRepository.count({
            where: { userId },
        });

        const hasPassword = !!user.hashedPassword;

        // Prevent unlinking if it's the only authentication method
        if (otherProviders === 1 && !hasPassword) {
            throw new BadRequestException(
                'Cannot unlink the only authentication method. Please set a password or link another account first.',
            );
        }

        // Remove the OAuth provider link
        await this.oauthProviderRepository.remove(oauthProvider);

        this.logger.log(`Unlinked ${provider} account from user ${userId}`);
    }

    /**
     * Get all linked OAuth providers for a user
     */
    async getLinkedProviders(userId: string): Promise<OAuthProviderType[]> {
        const providers = await this.oauthProviderRepository.find({
            where: { userId },
            select: ['provider'],
        });

        return providers.map(p => p.provider as OAuthProviderType);
    }

    /**
     * Check if a specific provider is linked to a user
     */
    async isProviderLinked(userId: string, provider: OAuthProviderType): Promise<boolean> {
        const count = await this.oauthProviderRepository.count({
            where: { userId, provider },
        });

        return count > 0;
    }

    /**
     * Update OAuth provider tokens
     */
    async updateProviderTokens(
        userId: string,
        provider: OAuthProviderType,
        accessToken: string,
        refreshToken?: string,
    ): Promise<void> {
        const oauthProvider = await this.oauthProviderRepository.findOne({
            where: { userId, provider },
        });

        if (!oauthProvider) {
            throw new NotFoundException(`${provider} account is not linked to this user`);
        }

        oauthProvider.accessTokenHash = await this.passwordService.hashPassword(accessToken);
        if (refreshToken) {
            oauthProvider.refreshTokenHash = await this.passwordService.hashPassword(refreshToken);
        }

        await this.oauthProviderRepository.save(oauthProvider);

        this.logger.debug(`Updated ${provider} tokens for user ${userId}`);
    }
}