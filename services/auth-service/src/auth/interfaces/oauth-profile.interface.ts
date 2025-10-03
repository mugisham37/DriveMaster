export interface BaseOAuthProfile {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    verified: boolean;
    picture?: string;
    username?: string;
}

export type OAuthProvider = 'google' | 'apple' | 'facebook' | 'github' | 'microsoft';

export interface OAuthResult {
    profile: BaseOAuthProfile;
    accessToken: string;
    refreshToken?: string;
    provider: OAuthProvider;
}