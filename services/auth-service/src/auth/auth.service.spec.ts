import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { User } from './entities/user.entity';
import { OAuthProvider } from './entities/oauth-provider.entity';

describe('AuthService', () => {
    let service: AuthService;
    let userRepository: Repository<User>;
    let oauthProviderRepository: Repository<OAuthProvider>;

    const mockUserRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockOAuthProviderRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockTokenService = {
        generateTokenPair: jest.fn(),
        refreshTokens: jest.fn(),
        revokeAllUserTokens: jest.fn(),
    };

    const mockPasswordService = {
        validatePasswordStrength: jest.fn(),
        hashPassword: jest.fn(),
        verifyPassword: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
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
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
        oauthProviderRepository = module.get<Repository<OAuthProvider>>(
            getRepositoryToken(OAuthProvider),
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const registerDto = {
                email: 'test@example.com',
                password: 'StrongPassword123!',
                countryCode: 'US',
            };

            const mockUser = {
                id: '123',
                email: registerDto.email,
                countryCode: registerDto.countryCode,
                mfaEnabled: false,
            };

            const mockTokens = {
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                expiresIn: 900,
            };

            mockUserRepository.findOne.mockResolvedValue(null);
            mockPasswordService.validatePasswordStrength.mockReturnValue({
                isValid: true,
                errors: [],
            });
            mockPasswordService.hashPassword.mockResolvedValue('hashed-password');
            mockUserRepository.create.mockReturnValue(mockUser);
            mockUserRepository.save.mockResolvedValue(mockUser);
            mockTokenService.generateTokenPair.mockResolvedValue(mockTokens);

            const result = await service.register(registerDto);

            expect(result).toEqual(mockTokens);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: registerDto.email },
            });
            expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith(
                registerDto.password,
            );
            expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(registerDto.password);
            expect(mockUserRepository.save).toHaveBeenCalled();
            expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(
                mockUser.id,
                mockUser.email,
                mockUser.countryCode,
                mockUser.mfaEnabled,
            );
        });

        it('should throw ConflictException if user already exists', async () => {
            const registerDto = {
                email: 'test@example.com',
                password: 'StrongPassword123!',
                countryCode: 'US',
            };

            mockUserRepository.findOne.mockResolvedValue({ id: '123' });

            await expect(service.register(registerDto)).rejects.toThrow('User with this email already exists');
        });
    });
});