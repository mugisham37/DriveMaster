import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    Req,
    Res,
    HttpCode,
    HttpStatus,
    Logger,
    Param,
    Delete,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AppleAuthGuard } from './guards/apple-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { GitHubAuthGuard } from './guards/github-auth.guard';
import { MicrosoftAuthGuard } from './guards/microsoft-auth.guard';
import { OAuthProviderType } from './interfaces/oauth-profile.interface';
import { OAuthService } from './services/oauth.service';
import { InitiateOAuthDto } from './dto/oauth-link.dto';

import { User } from './entities/user.entity';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly oauthService: OAuthService,
    ) { }

    @Public()
    @Post('register')
    async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
        const ipAddress = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || 'unknown';

        const tokens = await this.authService.register(registerDto, ipAddress, userAgent);
        return {
            message: 'Registration successful',
            ...tokens,
        };
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto, @Req() req: Request) {
        const ipAddress = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || 'unknown';

        const tokens = await this.authService.login(loginDto, ipAddress, userAgent);
        return {
            message: 'Login successful',
            ...tokens,
        };
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
        const tokens = await this.authService.refreshTokens(refreshTokenDto.refreshToken);

        if (!tokens) {
            return {
                message: 'Invalid or expired refresh token',
            };
        }

        return {
            message: 'Tokens refreshed successfully',
            ...tokens,
        };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@CurrentUser() user: User, @Req() req: Request) {
        const ipAddress = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || 'unknown';

        await this.authService.logout(user.id, ipAddress, userAgent);
        return {
            message: 'Logout successful',
        };
    }

    @Get('profile')
    getProfile(@CurrentUser() user: User) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hashedPassword, mfaSecret, ...profile } = user;
        return profile;
    }

    // OAuth Routes - Google
    @Public()
    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth() {
        // Initiates Google OAuth flow
    }

    @Public()
    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
        await this.handleOAuthCallback('google', req, res);
    }

    // OAuth Routes - Apple
    @Public()
    @Get('apple')
    @UseGuards(AppleAuthGuard)
    async appleAuth() {
        // Initiates Apple OAuth flow
    }

    @Public()
    @Get('apple/callback')
    @UseGuards(AppleAuthGuard)
    async appleAuthCallback(@Req() req: Request, @Res() res: Response) {
        await this.handleOAuthCallback('apple', req, res);
    }

    // OAuth Routes - Facebook
    @Public()
    @Get('facebook')
    @UseGuards(FacebookAuthGuard)
    async facebookAuth() {
        // Initiates Facebook OAuth flow
    }

    @Public()
    @Get('facebook/callback')
    @UseGuards(FacebookAuthGuard)
    async facebookAuthCallback(@Req() req: Request, @Res() res: Response) {
        await this.handleOAuthCallback('facebook', req, res);
    }

    // OAuth Routes - GitHub
    @Public()
    @Get('github')
    @UseGuards(GitHubAuthGuard)
    async githubAuth() {
        // Initiates GitHub OAuth flow
    }

    @Public()
    @Get('github/callback')
    @UseGuards(GitHubAuthGuard)
    async githubAuthCallback(@Req() req: Request, @Res() res: Response) {
        await this.handleOAuthCallback('github', req, res);
    }

    // OAuth Routes - Microsoft
    @Public()
    @Get('microsoft')
    @UseGuards(MicrosoftAuthGuard)
    async microsoftAuth() {
        // Initiates Microsoft OAuth flow
    }

    @Public()
    @Get('microsoft/callback')
    @UseGuards(MicrosoftAuthGuard)
    async microsoftAuthCallback(@Req() req: Request, @Res() res: Response) {
        await this.handleOAuthCallback('microsoft', req, res);
    }

    // Account linking endpoints
    @Post('link/:provider')
    async linkProvider(
        @Param('provider') provider: OAuthProviderType,
        @CurrentUser() user: User,
        @Req() req: Request,
    ) {
        const { profile, accessToken, refreshToken } = req.user as any;

        await this.authService.linkOAuthProvider(
            user.id,
            provider,
            profile,
            accessToken,
            refreshToken,
        );

        return {
            message: `${provider} account linked successfully`,
        };
    }

    @Delete('unlink/:provider')
    async unlinkProvider(
        @Param('provider') provider: OAuthProviderType,
        @CurrentUser() user: User,
    ) {
        await this.authService.unlinkOAuthProvider(user.id, provider);

        return {
            message: `${provider} account unlinked successfully`,
        };
    }

    @Get('linked-providers')
    async getLinkedProviders(@CurrentUser() user: User) {
        const providers = await this.authService.getLinkedProviders(user.id);

        return {
            linkedProviders: providers,
        };
    }

    /**
     * Generic OAuth callback handler
     */
    private async handleOAuthCallback(
        provider: OAuthProviderType,
        req: Request,
        res: Response,
    ): Promise<void> {
        try {
            const { profile, accessToken, refreshToken } = req.user as any;
            const ipAddress = this.getClientIP(req);
            const userAgent = req.get('User-Agent') || 'unknown';

            const tokens = await this.authService.handleOAuthLogin(
                provider,
                profile,
                accessToken,
                ipAddress,
                userAgent,
                refreshToken,
            );

            // Redirect to frontend with tokens
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&provider=${provider}`;

            res.redirect(redirectUrl);
        } catch (error) {
            this.logger.error(`${provider} OAuth callback error:`, error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/error?provider=${provider}`);
        }
    }

    // OAuth configuration endpoints
    @Public()
    @Get('oauth/providers')
    getAvailableProviders() {
        const enabledProviders = this.oauthService.getEnabledProviders();

        return {
            providers: enabledProviders,
            count: enabledProviders.length,
        };
    }

    @Public()
    @Post('oauth/initiate')
    initiateOAuth(@Body() initiateDto: InitiateOAuthDto) {
        const { provider, redirectUrl } = initiateDto;

        const result = this.oauthService.generateAuthUrl(provider, redirectUrl);

        return {
            authUrl: result.authUrl,
            state: result.state,
            provider,
        };
    }

    @Get('health')
    @Public()
    health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'auth-service',
            oauthProviders: this.oauthService.getEnabledProviders(),
        };
    }

    /**
     * Get client IP address, considering proxies
     */
    private getClientIP(req: Request): string {
        const forwarded = req.get('X-Forwarded-For');
        const realIP = req.get('X-Real-IP');
        const cfConnectingIP = req.get('CF-Connecting-IP'); // Cloudflare

        if (cfConnectingIP) return cfConnectingIP;
        if (realIP) return realIP;
        if (forwarded) return forwarded.split(',')[0].trim();

        return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    }
}