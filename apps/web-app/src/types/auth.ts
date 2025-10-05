export interface User {
    id: string;
    email: string;
    emailVerified: boolean;
    countryCode: string;
    timezone: string;
    language: string;
    preferences: Record<string, any>;
    mfaEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    lastActiveAt: string;
    isActive: boolean;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}

export interface AuthState {
    user: User | null;
    tokens: TokenPair | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    countryCode: string;
    timezone?: string;
    language?: string;
}

export interface OAuthProvider {
    name: string;
    displayName: string;
    iconUrl?: string;
}

export interface MFASetup {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}