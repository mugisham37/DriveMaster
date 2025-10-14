import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { OAuthProviderType } from '../interfaces/oauth-profile.interface';

export class InitiateOAuthDto {
    @IsEnum(['google', 'apple', 'facebook', 'github', 'microsoft'])
    provider: OAuthProviderType;

    @IsOptional()
    @IsUrl()
    redirectUrl?: string;

    @IsOptional()
    @IsString()
    state?: string;
}

export class OAuthCallbackDto {
    @IsString()
    code: string;

    @IsString()
    state: string;

    @IsOptional()
    @IsString()
    error?: string;

    @IsOptional()
    @IsString()
    error_description?: string;
}

export class LinkProviderDto {
    @IsEnum(['google', 'apple', 'facebook', 'github', 'microsoft'])
    provider: OAuthProviderType;
}

export class UnlinkProviderDto {
    @IsEnum(['google', 'apple', 'facebook', 'github', 'microsoft'])
    provider: OAuthProviderType;
}