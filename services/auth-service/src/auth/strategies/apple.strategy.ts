import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

export interface AppleProfile {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    verified: boolean;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.get<string>('APPLE_CLIENT_ID'),
            teamID: configService.get<string>('APPLE_TEAM_ID'),
            keyID: configService.get<string>('APPLE_KEY_ID'),
            privateKeyLocation: configService.get<string>('APPLE_PRIVATE_KEY_PATH'),
            callbackURL: configService.get<string>('APPLE_CALLBACK_URL'),
            scope: ['name', 'email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        idToken: any,
        profile: any,
        done: any,
    ): Promise<any> {
        const { sub, email, email_verified } = idToken;
        const { name } = profile;

        const appleProfile: AppleProfile = {
            id: sub,
            email: email,
            firstName: name?.firstName,
            lastName: name?.lastName,
            verified: email_verified === 'true',
        };

        done(null, {
            profile: appleProfile,
            accessToken,
            refreshToken,
        });
    }
}