# OAuth 2.0/OIDC Integration

This document describes the comprehensive OAuth 2.0 and OpenID Connect integration implemented in the authentication service.

## Supported Providers

The service supports the following OAuth providers:

- **Google OAuth 2.0** - Full implementation with refresh tokens
- **Apple Sign In** - OIDC implementation with ID tokens
- **Facebook Login** - OAuth 2.0 with profile access
- **GitHub OAuth** - OAuth 2.0 with email scope
- **Microsoft Azure AD** - OAuth 2.0/OIDC with Graph API integration

## Features

### Core OAuth Features

1. **Multiple Provider Support**: Users can authenticate with any of the supported providers
2. **Account Linking**: Users can link multiple OAuth providers to a single account
3. **State Validation**: CSRF protection using secure state parameters
4. **Token Management**: Secure storage and refresh of OAuth tokens
5. **Profile Normalization**: Consistent user profile structure across providers

### Security Features

1. **State Parameter Validation**: Prevents CSRF attacks
2. **Token Hashing**: OAuth tokens are hashed before storage
3. **Secure Redirects**: Validated redirect URLs
4. **Account Protection**: Prevents unlinking the last authentication method

## API Endpoints

### OAuth Initiation

```http
GET /auth/oauth/providers
```

Returns list of enabled OAuth providers.

```http
POST /auth/oauth/initiate
Content-Type: application/json

{
  "provider": "google",
  "redirectUrl": "https://example.com/callback"
}
```

Generates OAuth authorization URL with state parameter.

### Provider-Specific Endpoints

Each provider has dedicated endpoints:

```http
GET /auth/google
GET /auth/google/callback

GET /auth/apple
GET /auth/apple/callback

GET /auth/facebook
GET /auth/facebook/callback

GET /auth/github
GET /auth/github/callback

GET /auth/microsoft
GET /auth/microsoft/callback
```

### Account Management

```http
POST /auth/link/{provider}
```

Link an OAuth provider to the current user account.

```http
DELETE /auth/unlink/{provider}
```

Unlink an OAuth provider from the current user account.

```http
GET /auth/linked-providers
```

Get list of OAuth providers linked to the current user.

## Configuration

### Environment Variables

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Apple OAuth
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=./certs/apple-private-key.p8
APPLE_CALLBACK_URL=http://localhost:3001/auth/apple/callback

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3001/auth/facebook/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_CALLBACK_URL=http://localhost:3001/auth/microsoft/callback
MICROSOFT_TENANT=common

# OAuth Security
OAUTH_STATE_EXPIRATION_MS=600000
```

### Provider Setup

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs

#### Apple Sign In Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create a new App ID with Sign In with Apple capability
3. Create a Services ID for web authentication
4. Generate a private key for JWT signing
5. Configure domains and redirect URLs

#### Facebook Login Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs
5. Set up app permissions

#### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set authorization callback URL
4. Note the Client ID and Client Secret

#### Microsoft Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application in Azure AD
3. Configure redirect URIs
4. Set up API permissions
5. Create client secret

## Usage Examples

### Frontend Integration

```javascript
// Get available providers
const response = await fetch("/auth/oauth/providers");
const { providers } = await response.json();

// Initiate OAuth flow
const initiateResponse = await fetch("/auth/oauth/initiate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    provider: "google",
    redirectUrl: window.location.origin + "/auth/callback",
  }),
});

const { authUrl } = await initiateResponse.json();
window.location.href = authUrl;
```

### Account Linking

```javascript
// Link additional provider
const linkResponse = await fetch("/auth/link/facebook", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});

// Get linked providers
const providersResponse = await fetch("/auth/linked-providers", {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const { linkedProviders } = await providersResponse.json();
```

## Error Handling

The OAuth integration includes comprehensive error handling:

- **Invalid State**: CSRF protection validation
- **Provider Errors**: OAuth provider-specific error handling
- **Account Conflicts**: Email conflicts and duplicate linking prevention
- **Configuration Errors**: Missing or invalid provider configuration

## Security Considerations

1. **State Parameters**: All OAuth flows use cryptographically secure state parameters
2. **Token Storage**: OAuth tokens are hashed using Argon2 before database storage
3. **Redirect Validation**: Only configured redirect URLs are allowed
4. **Account Protection**: Users cannot unlink their last authentication method
5. **Rate Limiting**: OAuth endpoints are protected by rate limiting
6. **Audit Logging**: All OAuth operations are logged for security monitoring

## Testing

The OAuth integration includes comprehensive unit tests covering:

- New user registration via OAuth
- Existing user login via OAuth
- Account linking and unlinking
- Error scenarios and edge cases
- Security validations

Run tests with:

```bash
npm test -- --testPathPattern=auth.service.spec.ts
```

## Monitoring

The service provides monitoring endpoints:

```http
GET /auth/health
```

Returns service health including enabled OAuth providers.

Monitor OAuth-specific metrics:

- OAuth login success/failure rates
- Provider-specific usage statistics
- Account linking operations
- State validation failures

## Troubleshooting

### Common Issues

1. **Provider Not Available**: Check environment configuration
2. **State Validation Failed**: Verify callback URL configuration
3. **Token Refresh Failed**: Check provider-specific token handling
4. **Account Linking Failed**: Verify email conflicts and existing links

### Debug Logging

Enable debug logging for OAuth operations:

```bash
DEBUG=auth:oauth npm start
```

This will log detailed information about OAuth flows, state validation, and provider interactions.
