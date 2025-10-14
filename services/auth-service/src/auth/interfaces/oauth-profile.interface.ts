export interface BaseOAuthProfile {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    verified: boolean;
    picture?: string;
    username?: string;
}

export type OAuthProviderType = 'google' | 'apple' | 'facebook' | 'github' | 'microsoft';

// Keep backward compatibility
export type OAuthProvider = OAuthProviderType;

export interface OAuthResult {
    profile: BaseOAuthProfile;
    accessToken: string;
    refreshToken?: string;
    provider: OAuthProviderType;
}