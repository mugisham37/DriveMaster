import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface OAuthState {
    state: string;
    redirectUrl?: string;
    timestamp: number;
    nonce: string;
}

@Injectable()
export class OAuthStateService {
    private readonly logger = new Logger(OAuthStateService.name);
    private readonly stateStore = new Map<string, OAuthState>();
    private readonly stateExpirationMs: number;

    constructor(private readonly configService: ConfigService) {
        this.stateExpirationMs = this.configService.get<number>('OAUTH_STATE_EXPIRATION_MS', 600000); // 10 minutes

        // Clean up expired states every 5 minutes
        setInterval(() => this.cleanupExpiredStates(), 300000);
    }

    /**
     * Generate OAuth state parameter with CSRF protection
     */
    generateState(redirectUrl?: string): string {
        const state = crypto.randomBytes(32).toString('hex');
        const nonce = crypto.randomBytes(16).toString('hex');

        const oauthState: OAuthState = {
            state,
            redirectUrl,
            timestamp: Date.now(),
            nonce,
        };

        this.stateStore.set(state, oauthState);
        this.logger.debug(`Generated OAuth state: ${state}`);

        return state;
    }

    /**
     * Validate OAuth state parameter
     */
    validateState(state: string): OAuthState | null {
        const oauthState = this.stateStore.get(state);

        if (!oauthState) {
            this.logger.warn(`Invalid OAuth state: ${state}`);
            return null;
        }

        // Check if state has expired
        if (Date.now() - oauthState.timestamp > this.stateExpirationMs) {
            this.stateStore.delete(state);
            this.logger.warn(`Expired OAuth state: ${state}`);
            return null;
        }

        // Remove state after validation (one-time use)
        this.stateStore.delete(state);
        this.logger.debug(`Validated OAuth state: ${state}`);

        return oauthState;
    }

    /**
     * Clean up expired states
     */
    private cleanupExpiredStates(): void {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [state, oauthState] of this.stateStore.entries()) {
            if (now - oauthState.timestamp > this.stateExpirationMs) {
                this.stateStore.delete(state);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.logger.debug(`Cleaned up ${cleanedCount} expired OAuth states`);
        }
    }

    /**
     * Get current state store size (for monitoring)
     */
    getStateStoreSize(): number {
        return this.stateStore.size;
    }
}