# Authentication Service

The Authentication Service is a NestJS-based microservice that handles user authentication, authorization, and security for the Adaptive Learning Platform.

## Features

- **Email/Password Authentication**: Secure user registration and login with Argon2 password hashing
- **OAuth 2.0/OIDC Integration**: Support for Google OAuth and extensible for other providers
- **JWT Token Management**: Access tokens with refresh token rotation for security
- **Multi-Factor Authentication**: TOTP-based MFA support (ready for implementation)
- **Account Security**: Failed login attempt tracking, account lockout, and security policies
- **Password Strength Validation**: Comprehensive password requirements enforcement

## Architecture

### Core Components

- **AuthModule**: Main module orchestrating authentication services
- **AuthService**: Core business logic for authentication operations
- **TokenService**: JWT and refresh token management with rotation
- **PasswordService**: Argon2-based password hashing and validation
- **Strategies**: Passport.js strategies for JWT and OAuth authentication
- **Guards**: Authentication guards for route protection
- **Entities**: TypeORM entities for users, OAuth providers, and refresh tokens

### Database Schema

- **users**: Core user information with security fields
- **oauth_providers**: OAuth provider connections and tokens
- **refresh_tokens**: Secure refresh token storage with expiration

## API Endpoints

### Public Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/health` - Health check

### Protected Endpoints

- `POST /auth/logout` - User logout (revokes tokens)
- `GET /auth/profile` - Get user profile

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=adaptive_learning

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Security
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
```

## Development

### Installation

```bash
npm install
```

### Database Setup

1. Create PostgreSQL database
2. Run the migration script:

```bash
psql -d adaptive_learning -f src/database/migrations/001-initial-schema.sql
```

### Running the Service

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Testing

```bash
# Unit tests
npm test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Security Features

### Password Security

- Argon2id hashing with secure parameters
- Comprehensive strength validation
- Protection against common patterns

### Account Protection

- Failed login attempt tracking
- Temporary account lockout
- IP-based monitoring (ready for implementation)

### Token Security

- Short-lived access tokens (15 minutes)
- Refresh token rotation
- Secure token storage with hashing

### OAuth Security

- State parameter validation
- Secure token storage
- Account linking support

## Integration

The Authentication Service integrates with:

- **API Gateway**: JWT validation and user context
- **User Service**: User profile and progress data
- **Frontend Applications**: Token-based authentication
- **Other Services**: User identity and authorization

## Monitoring

The service provides:

- Health check endpoint
- Structured logging with correlation IDs
- Authentication event audit trails
- Security metrics (failed attempts, lockouts)

## Next Steps

This implementation covers task 5.1 requirements:

- ✅ NestJS project with proper module structure
- ✅ Passport.js with multiple OAuth strategies
- ✅ JWT token generation and validation
- ✅ Refresh token rotation mechanism
- ✅ Authentication middleware and guards

Ready for implementation of:

- Task 5.2: Additional OAuth providers (Apple, etc.)
- Task 5.3: MFA implementation with TOTP
- Task 5.4: Enhanced security policies and rate limiting
