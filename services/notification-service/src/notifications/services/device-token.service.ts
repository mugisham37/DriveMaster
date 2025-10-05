import { Injectable, Logger } from '@nestjs/common';
import { IDeviceTokenManager, DeviceTokenInfo } from '../interfaces/notification.interface';
import { DeviceToken } from '../entities/notification.entity';

@Injectable()
export class DeviceTokenService implements IDeviceTokenManager {
    private readonly logger = new Logger(DeviceTokenService.name);
    private tokens: Map<string, DeviceToken[]> = new Map(); // userId -> DeviceToken[]

    async registerToken(
        userId: string,
        token: string,
        platform: 'ios' | 'android' | 'web',
        metadata?: Record<string, any>
    ): Promise<void> {
        try {
            const userTokens = this.tokens.get(userId) || [];

            // Check if token already exists for this user
            const existingTokenIndex = userTokens.findIndex(t => t.token === token);

            if (existingTokenIndex >= 0) {
                // Update existing token
                userTokens[existingTokenIndex] = {
                    ...userTokens[existingTokenIndex],
                    platform,
                    isActive: true,
                    lastUsedAt: new Date(),
                    appVersion: metadata?.appVersion,
                    deviceInfo: metadata,
                    updatedAt: new Date(),
                };
                this.logger.log(`Updated device token for user ${userId} on ${platform}`);
            } else {
                // Add new token
                const deviceToken = new DeviceToken({
                    id: this.generateTokenId(),
                    userId,
                    token,
                    platform,
                    appVersion: metadata?.appVersion,
                    deviceInfo: metadata,
                });

                userTokens.push(deviceToken);
                this.logger.log(`Registered new device token for user ${userId} on ${platform}`);
            }

            this.tokens.set(userId, userTokens);
        } catch (error) {
            this.logger.error(`Failed to register device token for user ${userId}`, error);
            throw error;
        }
    }

    async removeToken(userId: string, token: string): Promise<void> {
        try {
            const userTokens = this.tokens.get(userId) || [];
            const updatedTokens = userTokens.filter(t => t.token !== token);

            if (updatedTokens.length !== userTokens.length) {
                this.tokens.set(userId, updatedTokens);
                this.logger.log(`Removed device token for user ${userId}`);
            }
        } catch (error) {
            this.logger.error(`Failed to remove device token for user ${userId}`, error);
            throw error;
        }
    }

    async getActiveTokens(userId: string): Promise<string[]> {
        try {
            const userTokens = this.tokens.get(userId) || [];
            return userTokens
                .filter(token => token.isActive)
                .map(token => token.token);
        } catch (error) {
            this.logger.error(`Failed to get active tokens for user ${userId}`, error);
            return [];
        }
    }

    async cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
        try {
            let cleanedCount = 0;

            for (const [userId, userTokens] of this.tokens.entries()) {
                const updatedTokens = userTokens.map(token => {
                    if (invalidTokens.includes(token.token)) {
                        cleanedCount++;
                        return {
                            ...token,
                            isActive: false,
                            updatedAt: new Date(),
                        };
                    }
                    return token;
                });

                this.tokens.set(userId, updatedTokens);
            }

            this.logger.log(`Cleaned up ${cleanedCount} invalid device tokens`);
        } catch (error) {
            this.logger.error('Failed to cleanup invalid tokens', error);
            throw error;
        }
    }

    async getUserTokens(userId: string, platform?: 'ios' | 'android' | 'web'): Promise<DeviceTokenInfo[]> {
        try {
            const userTokens = this.tokens.get(userId) || [];

            let filteredTokens = userTokens;
            if (platform) {
                filteredTokens = userTokens.filter(token => token.platform === platform);
            }

            return filteredTokens.map(token => ({
                token: token.token,
                platform: token.platform,
                isActive: token.isActive,
                lastUsedAt: token.lastUsedAt,
                appVersion: token.appVersion,
                deviceInfo: token.deviceInfo,
            }));
        } catch (error) {
            this.logger.error(`Failed to get user tokens for user ${userId}`, error);
            return [];
        }
    }

    async updateTokenActivity(userId: string, token: string): Promise<void> {
        try {
            const userTokens = this.tokens.get(userId) || [];
            const tokenIndex = userTokens.findIndex(t => t.token === token);

            if (tokenIndex >= 0) {
                userTokens[tokenIndex] = {
                    ...userTokens[tokenIndex],
                    lastUsedAt: new Date(),
                    updatedAt: new Date(),
                };

                this.tokens.set(userId, userTokens);
            }
        } catch (error) {
            this.logger.error(`Failed to update token activity for user ${userId}`, error);
        }
    }

    async getTokensByPlatform(platform: 'ios' | 'android' | 'web'): Promise<DeviceTokenInfo[]> {
        try {
            const allTokens: DeviceTokenInfo[] = [];

            for (const userTokens of this.tokens.values()) {
                const platformTokens = userTokens
                    .filter(token => token.platform === platform && token.isActive)
                    .map(token => ({
                        token: token.token,
                        platform: token.platform,
                        isActive: token.isActive,
                        lastUsedAt: token.lastUsedAt,
                        appVersion: token.appVersion,
                        deviceInfo: token.deviceInfo,
                    }));

                allTokens.push(...platformTokens);
            }

            return allTokens;
        } catch (error) {
            this.logger.error(`Failed to get tokens by platform ${platform}`, error);
            return [];
        }
    }

    async getInactiveTokens(daysInactive: number = 30): Promise<string[]> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

            const inactiveTokens: string[] = [];

            for (const userTokens of this.tokens.values()) {
                const inactive = userTokens
                    .filter(token => token.lastUsedAt < cutoffDate)
                    .map(token => token.token);

                inactiveTokens.push(...inactive);
            }

            return inactiveTokens;
        } catch (error) {
            this.logger.error('Failed to get inactive tokens', error);
            return [];
        }
    }

    async deactivateInactiveTokens(daysInactive: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

            let deactivatedCount = 0;

            for (const [userId, userTokens] of this.tokens.entries()) {
                const updatedTokens = userTokens.map(token => {
                    if (token.lastUsedAt < cutoffDate && token.isActive) {
                        deactivatedCount++;
                        return {
                            ...token,
                            isActive: false,
                            updatedAt: new Date(),
                        };
                    }
                    return token;
                });

                this.tokens.set(userId, updatedTokens);
            }

            this.logger.log(`Deactivated ${deactivatedCount} inactive device tokens`);
            return deactivatedCount;
        } catch (error) {
            this.logger.error('Failed to deactivate inactive tokens', error);
            return 0;
        }
    }

    async getUserCount(): Promise<number> {
        return this.tokens.size;
    }

    async getTotalTokenCount(): Promise<number> {
        let total = 0;
        for (const userTokens of this.tokens.values()) {
            total += userTokens.length;
        }
        return total;
    }

    async getActiveTokenCount(): Promise<number> {
        let active = 0;
        for (const userTokens of this.tokens.values()) {
            active += userTokens.filter(token => token.isActive).length;
        }
        return active;
    }

    async getTokenStats(): Promise<{
        totalUsers: number;
        totalTokens: number;
        activeTokens: number;
        inactiveTokens: number;
        platformBreakdown: Record<string, number>;
    }> {
        try {
            const totalUsers = await this.getUserCount();
            const totalTokens = await this.getTotalTokenCount();
            const activeTokens = await this.getActiveTokenCount();
            const inactiveTokens = totalTokens - activeTokens;

            const platformBreakdown: Record<string, number> = {
                ios: 0,
                android: 0,
                web: 0,
            };

            for (const userTokens of this.tokens.values()) {
                for (const token of userTokens) {
                    if (token.isActive) {
                        platformBreakdown[token.platform]++;
                    }
                }
            }

            return {
                totalUsers,
                totalTokens,
                activeTokens,
                inactiveTokens,
                platformBreakdown,
            };
        } catch (error) {
            this.logger.error('Failed to get token stats', error);
            throw error;
        }
    }

    private generateTokenId(): string {
        return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}