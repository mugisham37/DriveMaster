import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

export interface FacebookProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    verified: boolean;
}

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.get<string>('FACEBOOK_CLIENT_ID'),
            clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET'),
            callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'),
            scope: ['email', 'public_profile'],
            profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: any,
    ): Promise<any> {
        const { id, name, emails, photos } = profile;

        const facebookProfile: FacebookProfile = {
            id,
            email: emails?.[0]?.value || '',
            firstName: name.givenName,
            lastName: name.familyName,
            picture: photos?.[0]?.value || '',
            verified: true, // Facebook emails are generally verified
        };

        done(null, {
            profile: facebookProfile,
            accessToken,
            refreshToken,
        });
    }
}