import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { AccountLinkingService } from './services/account-linking.service';

describe('AuthService - OAuth Integration', () => {
    let service: AuthService;
    let mockUserRepository: any;
    let mockOAuthProviderRepository: any;
    let mockTokenService: any;
    let mockPasswordService: any;
    let mockAccountLinkingService: any;

    beforeEach(async () => {
        mockUserRepository = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        };

        mockOAuthProviderRepository = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        };

        mockTokenService = {
            generateTokenPair: jest.fn(),
        };

        mockPasswordService = {
            hashPassword: jest.fn(),
        };

        mockAccountLinkingService = {
            linkAccount: jest.fn(),
            updateProviderTokens: jest.fn(),
            getLinkedProviders: jest.fn(),
            unlinkAccount: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: getRepositoryToken(OAuthProvider),
                    useValue: mockOAuthProviderRepository,
                },
                {
                    provide: TokenService,
                    useValue: mockTokenService,
                },
                {
                    provide: PasswordService,
                    useValue: mockPasswordService,
                },
                {
                    provide: AccountLinkingService,
                    useValue: mockAccountLinkingService,
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            const config = {
                                MAX_FAILED_ATTEMPTS: 5,
                                LOCKOUT_DURATION_MINUTES: 30,
                            };
                            return config[key] || defaultValue;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleOAuthLogin', () => {
        it('should handle new user OAuth registration', async () => {
            const profile = {
                id: 'google123',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                verified: true,
            };

            const mockUser = {
                id: 'user123',
                email: 'test@example.com',
                countryCode: 'US',
                mfaEnabled: false,
            };

            const mockTokens = {
                accessToken: 'access_token',
                refreshToken: 'refresh_token',
            };

            mockOAuthProviderRepository.findOne.mockResolvedValue(null);
            mockUserRepository.findOne.mockResolvedValue(null);
            mockUserRepository.create.mockReturnValue(mockUser);
            mockUserRepository.save.mockResolvedValue(mockUser);
            mockTokenService.generateTokenPair.mockResolvedValue(mockTokens);

            const result = await service.handleOAuthLogin(
                'google',
                profile,
                'access_token',
                '127.0.0.1',
                'test-user-agent',
                'refresh_token',
            );

            expect(result).toEqual(mockTokens);
            expect(mockUserRepository.create).toHaveBeenCalledWith({
                email: profile.email,
                emailVerified: profile.verified,
                countryCode: 'US',
                hashedPassword: null,
            });
            expect(mockAccountLinkingService.linkAccount).toHaveBeenCalled();
        });

        it('should handle existing user OAuth login', async () => {
            const profile = {
                id: 'google123',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                verified: true,
            };

            const mockUser = {
                id: 'user123',
                email: 'test@example.com',
                countryCode: 'US',
                mfaEnabled: false,
                lastActiveAt: new Date(),
            };

            const mockOAuthProvider = {
                userId: 'user123',
                provider: 'google',
                providerUserId: 'google123',
                user: mockUser,
            };

            const mockTokens = {
                accessToken: 'access_token',
                refreshToken: 'refresh_token',
            };

            mockOAuthProviderRepository.findOne.mockResolvedValue(mockOAuthProvider);
            mockUserRepository.save.mockResolvedValue(mockUser);
            mockTokenService.generateTokenPair.mockResolvedValue(mockTokens);

            const result = await service.handleOAuthLogin(
                'google',
                profile,
                'access_token',
                '127.0.0.1',
                'test-user-agent',
                'refresh_token',
            );

            expect(result).toEqual(mockTokens);
            expect(mockAccountLinkingService.updateProviderTokens).toHaveBeenCalledWith(
                'user123',
                'google',
                'access_token',
                'refresh_token',
            );
        });
    });

    describe('linkOAuthProvider', () => {
        it('should link OAuth provider to existing user', async () => {
            const userId = 'user123';
            const provider = 'facebook';
            const profile = {
                id: 'facebook123',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                verified: true,
            };

            await service.linkOAuthProvider(
                userId,
                provider,
                profile,
                'access_token',
                'refresh_token',
            );

            expect(mockAccountLinkingService.linkAccount).toHaveBeenCalledWith({
                userId,
                provider,
                profile,
                accessToken: 'access_token',
                refreshToken: 'refresh_token',
            });
        });
    });

    describe('unlinkOAuthProvider', () => {
        it('should unlink OAuth provider from user', async () => {
            const userId = 'user123';
            const provider = 'github';

            await service.unlinkOAuthProvider(userId, provider);

            expect(mockAccountLinkingService.unlinkAccount).toHaveBeenCalledWith({
                userId,
                provider,
            });
        });
    });

    describe('getLinkedProviders', () => {
        it('should return linked providers for user', async () => {
            const userId = 'user123';
            const providers = ['google', 'facebook'];

            mockAccountLinkingService.getLinkedProviders.mockResolvedValue(providers);

            const result = await service.getLinkedProviders(userId);

            expect(result).toEqual(providers);
            expect(mockAccountLinkingService.getLinkedProviders).toHaveBeenCalledWith(userId);
        });
    });
});