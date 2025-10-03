import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

export interface GitHubProfile {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    username: string;
    picture: string;
    verified: boolean;
}

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.get<string>('GITHUB_CLIENT_ID'),
            clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
            callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
            scope: ['user:email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: any,
    ): Promise<any> {
        const { id, username, displayName, emails, photos } = profile;

        // Parse display name if available
        const nameParts = displayName ? displayName.split(' ') : [];
        const firstName = nameParts[0] || username;
        const lastName = nameParts.slice(1).join(' ') || '';

        const githubProfile: GitHubProfile = {
            id: id.toString(),
            email: emails?.[0]?.value || '',
            firstName,
            lastName,
            username,
            picture: photos?.[0]?.value || '',
            verified: emails?.[0]?.verified || false,
        };

        done(null, {
            profile: githubProfile,
            accessToken,
            refreshToken,
        });
    }
}