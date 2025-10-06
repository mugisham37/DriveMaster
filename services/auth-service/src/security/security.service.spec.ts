import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecurityService } from './security.service';

describe('SecurityService', () => {
    let service: SecurityService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SecurityService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            const config = {
                                MASTER_ENCRYPTION_KEY: 'test-master-key-for-testing-purposes',
                                MAX_STRING_LENGTH: 1000,
                                MAX_EMAIL_LENGTH: 254,
                                STRICT_VALIDATION: true,
                                RATE_LIMIT_WINDOW_MS: 900000,
                                RATE_LIMIT_MAX_REQUESTS: 5,
                            };
                            return config[key] || defaultValue;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<SecurityService>(SecurityService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateAndSanitizeString', () => {
        it('should sanitize valid string', () => {
            const input = 'Hello, World!';
            const result = service.validateAndSanitizeString(input, 'test');
            expect(result).toBe('Hello, World!');
        });

        it('should sanitize HTML content', () => {
            const input = '<p>Hello, <b>World!</b></p>';
            const result = service.validateAndSanitizeString(input, 'test');
            expect(result).toBe('Hello, World!');
        });

        it('should throw error for text too long', () => {
            const input = 'a'.repeat(1001);
            expect(() => service.validateAndSanitizeString(input, 'test')).toThrow('exceeds maximum length');
        });

        it('should throw error for suspicious SQL injection patterns', () => {
            const input = "'; DROP TABLE users; --";
            expect(() => service.validateAndSanitizeString(input, 'test')).toThrow('suspicious content');
        });

        it('should throw error for XSS patterns', () => {
            const input = '<script>alert("xss")</script>';
            expect(() => service.validateAndSanitizeString(input, 'test')).toThrow('suspicious content');
        });

        it('should handle empty string', () => {
            const result = service.validateAndSanitizeString('', 'test');
            expect(result).toBe('');
        });

        it('should handle null input', () => {
            const result = service.validateAndSanitizeString(null, 'test');
            expect(result).toBeNull();
        });
    });

    describe('validateAndSanitizeEmail', () => {
        it('should validate and sanitize valid email', () => {
            const email = 'Test@Example.COM';
            const result = service.validateAndSanitizeEmail(email);
            expect(result).toBe('test@example.com');
        });

        it('should throw error for empty email', () => {
            expect(() => service.validateAndSanitizeEmail('')).toThrow('Email is required');
        });

        it('should throw error for invalid email format', () => {
            expect(() => service.validateAndSanitizeEmail('invalid-email')).toThrow('Invalid email format');
        });

        it('should throw error for email too long', () => {
            const longEmail = 'a'.repeat(250) + '@example.com';
            expect(() => service.validateAndSanitizeEmail(longEmail)).toThrow('exceeds maximum length');
        });

        it('should throw error for suspicious content in email', () => {
            const email = "test@example.com'; DROP TABLE users; --";
            expect(() => service.validateAndSanitizeEmail(email)).toThrow('suspicious content');
        });
    });

    describe('validateUUID', () => {
        it('should validate valid UUID v4', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            expect(() => service.validateUUID(uuid, 'id')).not.toThrow();
        });

        it('should throw error for empty UUID', () => {
            expect(() => service.validateUUID('', 'id')).toThrow('id is required');
        });

        it('should throw error for invalid UUID format', () => {
            expect(() => service.validateUUID('invalid-uuid', 'id')).toThrow('Invalid id format');
        });

        it('should throw error for wrong UUID version', () => {
            const uuid = '550e8400-e29b-31d4-a716-446655440000'; // version 3, not 4
            expect(() => service.validateUUID(uuid, 'id')).toThrow('Invalid id format');
        });
    });

    describe('validateJSON', () => {
        it('should validate valid JSON', () => {
            const json = '{"key": "value"}';
            const result = service.validateJSON(json, 'data');
            expect(result).toEqual({ key: 'value' });
        });

        it('should return null for empty JSON', () => {
            const result = service.validateJSON('', 'data');
            expect(result).toBeNull();
        });

        it('should throw error for invalid JSON', () => {
            const json = '{"key": invalid}';
            expect(() => service.validateJSON(json, 'data')).toThrow('Invalid JSON');
        });

        it('should throw error for prototype pollution attempt', () => {
            const json = '{"__proto__": {"admin": true}}';
            expect(() => service.validateJSON(json, 'data')).toThrow('prototype pollution');
        });

        it('should throw error for constructor pollution', () => {
            const json = '{"constructor": {"prototype": {"admin": true}}}';
            expect(() => service.validateJSON(json, 'data')).toThrow('prototype pollution');
        });
    });

    describe('encryptSensitiveData and decryptSensitiveData', () => {
        it('should encrypt and decrypt data correctly', () => {
            const data = 'sensitive information';
            const encrypted = service.encryptSensitiveData(data);
            expect(encrypted).not.toBe(data);
            expect(encrypted.length).toBeGreaterThan(0);

            const decrypted = service.decryptSensitiveData(encrypted);
            expect(decrypted).toBe(data);
        });

        it('should handle empty data', () => {
            const encrypted = service.encryptSensitiveData('');
            expect(encrypted).toBe('');

            const decrypted = service.decryptSensitiveData('');
            expect(decrypted).toBe('');
        });

        it('should produce different encrypted values for same data', () => {
            const data = 'test data';
            const encrypted1 = service.encryptSensitiveData(data);
            const encrypted2 = service.encryptSensitiveData(data);
            expect(encrypted1).not.toBe(encrypted2);

            // But both should decrypt to same value
            expect(service.decryptSensitiveData(encrypted1)).toBe(data);
            expect(service.decryptSensitiveData(encrypted2)).toBe(data);
        });

        it('should throw error for invalid encrypted data', () => {
            expect(() => service.decryptSensitiveData('invalid-encrypted-data')).toThrow('Decryption failed');
        });
    });

    describe('generateSecureToken', () => {
        it('should generate secure token with default length', () => {
            const token = service.generateSecureToken();
            expect(token).toBeDefined();
            expect(token.length).toBeGreaterThan(0);
        });

        it('should generate secure token with custom length', () => {
            const token = service.generateSecureToken(64);
            expect(token).toBeDefined();
            expect(token.length).toBeGreaterThan(0);
        });

        it('should generate different tokens', () => {
            const token1 = service.generateSecureToken();
            const token2 = service.generateSecureToken();
            expect(token1).not.toBe(token2);
        });
    });

    describe('createSecureHash and verifySecureHash', () => {
        it('should create and verify hash correctly', () => {
            const data = 'test data';
            const hash = service.createSecureHash(data);
            expect(hash).toBeDefined();
            expect(hash.length).toBeGreaterThan(0);

            const isValid = service.verifySecureHash(data, hash);
            expect(isValid).toBe(true);
        });

        it('should fail verification for wrong data', () => {
            const data = 'test data';
            const hash = service.createSecureHash(data);

            const isValid = service.verifySecureHash('wrong data', hash);
            expect(isValid).toBe(false);
        });

        it('should create different hashes for same data', () => {
            const data = 'test data';
            const hash1 = service.createSecureHash(data);
            const hash2 = service.createSecureHash(data);
            expect(hash1).not.toBe(hash2);

            // But both should verify correctly
            expect(service.verifySecureHash(data, hash1)).toBe(true);
            expect(service.verifySecureHash(data, hash2)).toBe(true);
        });

        it('should handle invalid hash format', () => {
            const isValid = service.verifySecureHash('data', 'invalid-hash');
            expect(isValid).toBe(false);
        });
    });

    describe('validateIPAddress', () => {
        it('should validate IPv4 addresses', () => {
            expect(service.validateIPAddress('192.168.1.1')).toBe(true);
            expect(service.validateIPAddress('127.0.0.1')).toBe(true);
            expect(service.validateIPAddress('255.255.255.255')).toBe(true);
        });

        it('should validate IPv6 addresses', () => {
            expect(service.validateIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
            expect(service.validateIPAddress('::1')).toBe(true);
        });

        it('should reject invalid IP addresses', () => {
            expect(service.validateIPAddress('256.256.256.256')).toBe(false);
            expect(service.validateIPAddress('invalid-ip')).toBe(false);
            expect(service.validateIPAddress('')).toBe(false);
        });
    });

    describe('validateUserAgent', () => {
        it('should validate normal user agent', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
            const result = service.validateUserAgent(userAgent);
            expect(result).toBe(userAgent);
        });

        it('should handle empty user agent', () => {
            const result = service.validateUserAgent('');
            expect(result).toBe('');
        });

        it('should throw error for user agent too long', () => {
            const longUserAgent = 'a'.repeat(600);
            expect(() => service.validateUserAgent(longUserAgent)).toThrow('too long');
        });

        it('should throw error for suspicious user agent', () => {
            const suspiciousUserAgent = 'Mozilla/5.0 <script>alert("xss")</script>';
            expect(() => service.validateUserAgent(suspiciousUserAgent)).toThrow('suspicious content');
        });
    });

    describe('sanitizeObject', () => {
        it('should sanitize object recursively', () => {
            const obj = {
                name: 'John Doe',
                email: 'john@example.com',
                nested: {
                    description: 'Safe description',
                    message: 'Hello world',
                },
                array: ['item1', 'item2'],
            };

            const sanitized = service.sanitizeObject(obj);
            expect(sanitized.name).toBe('John Doe');
            expect(sanitized.nested.message).toBe('Hello world');
            expect(sanitized.array[1]).toBe('item2');
        });

        it('should remove dangerous keys', () => {
            const obj = {
                name: 'John',
                __proto__: { admin: true },
                constructor: { prototype: { admin: true } },
                prototype: { admin: true },
            };

            const sanitized = service.sanitizeObject(obj);
            expect(sanitized.hasOwnProperty('__proto__')).toBe(false);
            expect(sanitized.hasOwnProperty('constructor')).toBe(false);
            expect(sanitized.hasOwnProperty('prototype')).toBe(false);
            expect(sanitized.name).toBe('John');
        });

        it('should handle null and primitive values', () => {
            expect(service.sanitizeObject(null)).toBeNull();
            expect(service.sanitizeObject('string')).toBe('string');
            expect(service.sanitizeObject(123)).toBe(123);
            expect(service.sanitizeObject(true)).toBe(true);
        });
    });

    describe('getSecurityConfig', () => {
        it('should return security configuration', () => {
            const config = service.getSecurityConfig();
            expect(config).toBeDefined();
            expect(config.encryption).toBeDefined();
            expect(config.validation).toBeDefined();
            expect(config.rateLimit).toBeDefined();
        });

        it('should return copy of config (not reference)', () => {
            const config1 = service.getSecurityConfig();
            const config2 = service.getSecurityConfig();
            expect(config1).not.toBe(config2);
            expect(config1).toEqual(config2);
        });
    });
});