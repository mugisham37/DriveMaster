import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthStateService } from './oauth-state.service';
import { OAuthProviderType } from '../interfaces/oauth-profile.interface';

export interface OAuthInitiationResult {
    authUrl: string;
    state: string;
}

@Injectable()
export class OAuthService {
    private readonly logger = new Logger(OAuthService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly oauthStateService: OAuthStateService,
    ) { }

    /**
     * Generate OAuth authorization URL with state parameter
     */
    generateAuthUrl(provider: OAuthProviderType, redirectUrl?: string): OAuthInitiationResult {
        const state = this.oauthStateService.generateState(redirectUrl);
        const baseUrl = this.getProviderBaseUrl(provider);
        const clientId = this.getProviderClientId(provider);
        const callbackUrl = this.getProviderCallbackUrl(provider);
        const scope = this.getProviderScope(provider);

        let authUrl: string;

        switch (provider) {
            case 'google':
                authUrl = `${baseUrl}?` +
                    `client_id=${clientId}&` +
                    `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
                    `scope=${encodeURIComponent(scope)}&` +
                    `response_type=code&` +
                    `state=${state}&` +
                    `access_type=offline&` +
                    `prompt=consent`;
                break;

            case 'apple':
                authUrl = `${baseUrl}?` +
                    `client_id=${clientId}&` +
                    `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
                    `scope=${encodeURIComponent(scope)}&` +
                    `response_type=code&` +
                    `state=${state}&` +
                    `response_mode=form_post`;
                break;

            case 'facebook':
                authUrl = `${baseUrl}?` +
                    `client_id=${clientId}&` +
                    `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
                    `scope=${encodeURIComponent(scope)}&` +
                    `response_type=code&` +
                    `state=${state}`;
                break;

            case 'github':
                authUrl = `${baseUrl}?` +
                    `client_id=${clientId}&` +
                    `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
                    `scope=${encodeURIComponent(scope)}&` +
                    `state=${state}`;
                break;

            case 'microsoft':
                const tenant = this.configService.get<string>('MICROSOFT_TENANT', 'common');
                authUrl = `${baseUrl.replace('{tenant}', tenant)}?` +
                    `client_id=${clientId}&` +
                    `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
                    `scope=${encodeURIComponent(scope)}&` +
                    `response_type=code&` +
                    `state=${state}&` +
                    `prompt=consent`;
                break;

            default:
                throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
        }

        this.logger.debug(`Generated OAuth URL for ${provider}: ${authUrl}`);

        return {
            authUrl,
            state,
        };
    }

    /**
     * Validate OAuth callback state
     */
    validateCallbackState(state: string): boolean {
        const oauthState = this.oauthStateService.validateState(state);
        return oauthState !== null;
    }

    /**
     * Get provider-specific configuration
     */
    private getProviderBaseUrl(provider: OAuthProviderType): string {
        const urls: Record<OAuthProviderType, string> = {
            google: 'https://accounts.google.com/o/oauth2/v2/auth',
            apple: 'https://appleid.apple.com/auth/authorize',
            facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
            github: 'https://github.com/login/oauth/authorize',
            microsoft: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
        };

        return urls[provider];
    }

    private getProviderClientId(provider: OAuthProviderType): string {
        const configKeys: Record<OAuthProviderType, string> = {
            google: 'GOOGLE_CLIENT_ID',
            apple: 'APPLE_CLIENT_ID',
            facebook: 'FACEBOOK_CLIENT_ID',
            github: 'GITHUB_CLIENT_ID',
            microsoft: 'MICROSOFT_CLIENT_ID',
        };

        const clientId = this.configService.get<string>(configKeys[provider]);
        if (!clientId) {
            throw new BadRequestException(`${provider} OAuth not configured`);
        }

        return clientId;
    }

    private getProviderCallbackUrl(provider: OAuthProviderType): string {
        const configKeys: Record<OAuthProviderType, string> = {
            google: 'GOOGLE_CALLBACK_URL',
            apple: 'APPLE_CALLBACK_URL',
            facebook: 'FACEBOOK_CALLBACK_URL',
            github: 'GITHUB_CALLBACK_URL',
            microsoft: 'MICROSOFT_CALLBACK_URL',
        };

        const callbackUrl = this.configService.get<string>(configKeys[provider]);
        if (!callbackUrl) {
            throw new BadRequestException(`${provider} callback URL not configured`);
        }

        return callbackUrl;
    }

    private getProviderScope(provider: OAuthProviderType): string {
        const scopes: Record<OAuthProviderType, string> = {
            google: 'openid email profile',
            apple: 'name email',
            facebook: 'email public_profile',
            github: 'user:email',
            microsoft: 'openid email profile',
        };

        return scopes[provider];
    }

    /**
     * Check if provider is enabled
     */
    isProviderEnabled(provider: OAuthProviderType): boolean {
        try {
            this.getProviderClientId(provider);
            this.getProviderCallbackUrl(provider);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get list of enabled providers
     */
    getEnabledProviders(): OAuthProviderType[] {
        const allProviders: OAuthProviderType[] = ['google', 'apple', 'facebook', 'github', 'microsoft'];
        return allProviders.filter(provider => this.isProviderEnabled(provider));
    }
}