import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface UserClaims {
    sub: string;
    email: string;
    countryCode: string;
    mfaEnabled: boolean;
    iat: number;
    exp: number;
}

@Injectable()
export class TokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,
    ) { }

    /**
     * Generate access and refresh token pair
     */
    async generateTokenPair(userId: string, email: string, countryCode: string, mfaEnabled: boolean): Promise<TokenPair> {
        const payload: Omit<UserClaims, 'iat' | 'exp'> = {
            sub: userId,
            email,
            countryCode,
            mfaEnabled,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = await this.generateRefreshToken(userId);

        const expiresIn = this.configService.get<number>('JWT_EXPIRES_IN_SECONDS', 900); // 15 minutes

        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }

    /**
     * Generate a new refresh token
     */
    private async generateRefreshToken(userId: string): Promise<string> {
        // Generate a cryptographically secure random token
        const token = crypto.randomBytes(64).toString('hex');
        const tokenHash = await argon2.hash(token);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        // Store the hashed token in database
        const refreshTokenEntity = this.refreshTokenRepository.create({
            userId,
            tokenHash,
            expiresAt,
        });

        await this.refreshTokenRepository.save(refreshTokenEntity);

        return token;
    }

    /**
     * Validate and refresh tokens using refresh token rotation
     */
    async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
        // Find all non-revoked refresh tokens and check against provided token
        const refreshTokenEntities = await this.refreshTokenRepository.find({
            where: { revoked: false },
            relations: ['user'],
        });

        let validTokenEntity: RefreshToken | null = null;

        // Check each token hash against the provided token
        for (const tokenEntity of refreshTokenEntities) {
            try {
                const isValid = await argon2.verify(tokenEntity.tokenHash, refreshToken);
                if (isValid) {
                    validTokenEntity = tokenEntity;
                    break;
                }
            } catch (error) {
                // Continue checking other tokens
                continue;
            }
        }

        if (!validTokenEntity) {
            return null;
        }

        // Check if token is expired
        if (validTokenEntity.expiresAt < new Date()) {
            await this.revokeRefreshToken(validTokenEntity.id);
            return null;
        }

        // Revoke the old refresh token (rotation)
        await this.revokeRefreshToken(validTokenEntity.id);

        // Generate new token pair
        return this.generateTokenPair(
            validTokenEntity.user.id,
            validTokenEntity.user.email,
            validTokenEntity.user.countryCode,
            validTokenEntity.user.mfaEnabled,
        );
    }

    /**
     * Revoke a refresh token
     */
    async revokeRefreshToken(tokenId: string): Promise<void> {
        await this.refreshTokenRepository.update(tokenId, { revoked: true });
    }

    /**
     * Revoke all refresh tokens for a user
     */
    async revokeAllUserTokens(userId: string): Promise<void> {
        await this.refreshTokenRepository.update(
            { userId, revoked: false },
            { revoked: true },
        );
    }

    /**
     * Clean up expired tokens
     */
    async cleanupExpiredTokens(): Promise<void> {
        await this.refreshTokenRepository.delete({
            expiresAt: { $lt: new Date() } as any,
        });
    }

    /**
     * Validate JWT token and extract claims
     */
    async validateToken(token: string): Promise<UserClaims | null> {
        try {
            const payload = this.jwtService.verify(token);
            return payload as UserClaims;
        } catch (error) {
            return null;
        }
    }
}