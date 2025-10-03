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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { User } from './entities/user.entity';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    @Public()
    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        const tokens = await this.authService.register(registerDto);
        return {
            message: 'Registration successful',
            ...tokens,
        };
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        const tokens = await this.authService.login(loginDto);
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
    async logout(@CurrentUser() user: User) {
        await this.authService.logout(user.id);
        return {
            message: 'Logout successful',
        };
    }

    @Get('profile')
    getProfile(@CurrentUser() user: User) {
        const { hashedPassword, mfaSecret, ...profile } = user;
        return profile;
    }

    // OAuth Routes
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
        try {
            const { profile, accessToken, refreshToken } = req.user as any;

            const tokens = await this.authService.handleOAuthLogin(
                'google',
                profile,
                accessToken,
                refreshToken,
            );

            // Redirect to frontend with tokens
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;

            res.redirect(redirectUrl);
        } catch (error) {
            this.logger.error('Google OAuth callback error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/error`);
        }
    }

    @Get('health')
    @Public()
    health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'auth-service',
        };
    }
}