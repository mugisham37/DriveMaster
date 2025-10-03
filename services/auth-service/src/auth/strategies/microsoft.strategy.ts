import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

export interface MicrosoftProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    verified: boolean;
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(OAuth2Strategy, 'microsoft') {
    constructor(private readonly configService: ConfigService) {
        const tenant = configService.get<string>('MICROSOFT_TENANT', 'common');

        super({
            authorizationURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
            tokenURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
            clientID: configService.get<string>('MICROSOFT_CLIENT_ID'),
            clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET'),
            callbackURL: configService.get<string>('MICROSOFT_CALLBACK_URL'),
            scope: ['openid', 'profile', 'email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: any,
    ): Promise<any> {
        try {
            // Fetch user profile from Microsoft Graph API
            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch Microsoft profile');
            }

            const userData = await response.json();

            const microsoftProfile: MicrosoftProfile = {
                id: userData.id,
                email: userData.mail || userData.userPrincipalName,
                firstName: userData.givenName || '',
                lastName: userData.surname || '',
                verified: true, // Microsoft emails are generally verified
            };

            done(null, {
                profile: microsoftProfile,
                accessToken,
                refreshToken,
            });
        } catch (error) {
            done(error, null);
        }
    }
}