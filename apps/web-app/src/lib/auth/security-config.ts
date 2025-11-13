/**
 * Security Configuration
 * 
 * Centralized security configuration for authentication system
 * Implements security requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

export interface SecurityConfig {
  // Token Security (16.1)
  tokenStorage: {
    accessTokenInMemoryOnly: boolean;
    refreshTokenInHttpOnlyCookie: boolean;
    tokenEncryption: boolean;
    clearTokensOnLogout: boolean;
  };

  // CSRF Protection (16.2)
  csrf: {
    enableStateParameter: boolean;
    enablePKCE: boolean;
    validateState: boolean;
    stateExpiration: number; // milliseconds
  };

  // Input Sanitization (16.3)
  inputSanitization: {
    enableXssProtection: boolean;
    enableSqlInjectionProtection: boolean;
    maxInputLength: {
      email: number;
      password: number;
      text: number;
      url: number;
      filename: number;
    };
  };

  // HTTPS Communication (16.4)
  https: {
    enforceHttps: boolean;
    allowHttpInDevelopment: boolean;
    secureCookies: boolean;
    noSensitiveDataInUrls: boolean;
  };

  // Session Timeout (16.5)
  sessionTimeout: {
    enabled: boolean;
    timeoutDuration: number; // milliseconds
    warningTime: number; // milliseconds
    trackActivity: boolean;
    activityEvents: string[];
  };
}

/**
 * Default security configuration
 * All security features enabled by default
 */
export const defaultSecurityConfig: SecurityConfig = {
  // Token Security
  tokenStorage: {
    accessTokenInMemoryOnly: true,
    refreshTokenInHttpOnlyCookie: true,
    tokenEncryption: true,
    clearTokensOnLogout: true,
  },

  // CSRF Protection
  csrf: {
    enableStateParameter: true,
    enablePKCE: true,
    validateState: true,
    stateExpiration: 10 * 60 * 1000, // 10 minutes
  },

  // Input Sanitization
  inputSanitization: {
    enableXssProtection: true,
    enableSqlInjectionProtection: true,
    maxInputLength: {
      email: 255,
      password: 128,
      text: 1000,
      url: 2048,
      filename: 255,
    },
  },

  // HTTPS Communication
  https: {
    enforceHttps: process.env.NODE_ENV === 'production',
    allowHttpInDevelopment: true,
    secureCookies: process.env.NODE_ENV === 'production',
    noSensitiveDataInUrls: true,
  },

  // Session Timeout
  sessionTimeout: {
    enabled: true,
    timeoutDuration: 30 * 60 * 1000, // 30 minutes
    warningTime: 5 * 60 * 1000, // 5 minutes
    trackActivity: true,
    activityEvents: ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'],
  },
};

/**
 * Get current security configuration
 */
export function getSecurityConfig(): SecurityConfig {
  return defaultSecurityConfig;
}

/**
 * Validate security configuration
 * Ensures all required security features are enabled
 */
export function validateSecurityConfig(config: SecurityConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate token storage
  if (!config.tokenStorage.accessTokenInMemoryOnly) {
    errors.push('CRITICAL: Access tokens must be stored in memory only');
  }

  if (!config.tokenStorage.refreshTokenInHttpOnlyCookie) {
    warnings.push('Refresh tokens should use httpOnly cookies for security');
  }

  if (!config.tokenStorage.clearTokensOnLogout) {
    errors.push('CRITICAL: Tokens must be cleared on logout');
  }

  // Validate CSRF protection
  if (!config.csrf.enableStateParameter) {
    errors.push('CRITICAL: OAuth state parameter must be enabled for CSRF protection');
  }

  if (!config.csrf.enablePKCE) {
    warnings.push('PKCE should be enabled for enhanced OAuth security');
  }

  if (!config.csrf.validateState) {
    errors.push('CRITICAL: State parameter validation must be enabled');
  }

  // Validate input sanitization
  if (!config.inputSanitization.enableXssProtection) {
    errors.push('CRITICAL: XSS protection must be enabled');
  }

  if (!config.inputSanitization.enableSqlInjectionProtection) {
    warnings.push('SQL injection protection should be enabled');
  }

  // Validate HTTPS
  if (process.env.NODE_ENV === 'production' && !config.https.enforceHttps) {
    errors.push('CRITICAL: HTTPS must be enforced in production');
  }

  if (process.env.NODE_ENV === 'production' && !config.https.secureCookies) {
    errors.push('CRITICAL: Secure cookies must be enabled in production');
  }

  if (!config.https.noSensitiveDataInUrls) {
    errors.push('CRITICAL: Sensitive data must not be included in URLs');
  }

  // Validate session timeout
  if (!config.sessionTimeout.enabled) {
    warnings.push('Session timeout should be enabled for security');
  }

  if (config.sessionTimeout.timeoutDuration < 5 * 60 * 1000) {
    warnings.push('Session timeout duration is very short (< 5 minutes)');
  }

  if (config.sessionTimeout.timeoutDuration > 60 * 60 * 1000) {
    warnings.push('Session timeout duration is very long (> 1 hour)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Security audit report
 * Generates a comprehensive security audit report
 */
export interface SecurityAuditReport {
  timestamp: Date;
  config: SecurityConfig;
  validation: ReturnType<typeof validateSecurityConfig>;
  recommendations: string[];
  complianceStatus: {
    requirement: string;
    status: 'compliant' | 'non-compliant' | 'warning';
    details: string;
  }[];
}

/**
 * Generate security audit report
 */
export function generateSecurityAudit(): SecurityAuditReport {
  const config = getSecurityConfig();
  const validation = validateSecurityConfig(config);

  const complianceStatus = [
    {
      requirement: '16.1 - Token Storage Security',
      status: (config.tokenStorage.accessTokenInMemoryOnly &&
        config.tokenStorage.refreshTokenInHttpOnlyCookie &&
        config.tokenStorage.clearTokensOnLogout
        ? 'compliant'
        : 'non-compliant') as 'compliant' | 'non-compliant',
      details: 'Access tokens in memory, refresh tokens in httpOnly cookies',
    },
    {
      requirement: '16.2 - CSRF Protection',
      status: (config.csrf.enableStateParameter &&
        config.csrf.validateState
        ? 'compliant'
        : 'non-compliant') as 'compliant' | 'non-compliant',
      details: 'OAuth state parameter and PKCE flow implemented',
    },
    {
      requirement: '16.3 - Input Sanitization',
      status: (config.inputSanitization.enableXssProtection
        ? 'compliant'
        : 'non-compliant') as 'compliant' | 'non-compliant',
      details: 'XSS protection and input validation enabled',
    },
    {
      requirement: '16.4 - HTTPS Communication',
      status: (process.env.NODE_ENV === 'development' ||
        (config.https.enforceHttps && config.https.secureCookies)
        ? 'compliant'
        : 'non-compliant') as 'compliant' | 'non-compliant',
      details: 'HTTPS enforced in production, secure cookies enabled',
    },
    {
      requirement: '16.5 - Session Timeout',
      status: (config.sessionTimeout.enabled
        ? 'compliant'
        : 'warning') as 'compliant' | 'warning',
      details: '30-minute timeout with 5-minute warning',
    },
  ];

  const recommendations = [
    'Regularly review and update security configuration',
    'Monitor security logs for suspicious activity',
    'Conduct periodic security audits',
    'Keep dependencies up to date',
    'Implement rate limiting on authentication endpoints',
    'Enable two-factor authentication for sensitive accounts',
    'Use Content Security Policy (CSP) headers',
    'Implement Subresource Integrity (SRI) for external resources',
  ];

  return {
    timestamp: new Date(),
    config,
    validation,
    recommendations,
    complianceStatus,
  };
}

/**
 * Check if running in secure context
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true;

  // Check if HTTPS or localhost
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  return isHttps || (isLocalhost && process.env.NODE_ENV === 'development');
}

/**
 * Validate URL for security
 * Ensures URL doesn't contain sensitive data
 */
export function validateUrlSecurity(url: string): {
  isSecure: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for sensitive data in URL
  const sensitivePatterns = [
    /token=/i,
    /password=/i,
    /secret=/i,
    /api[_-]?key=/i,
    /access[_-]?token=/i,
    /refresh[_-]?token=/i,
  ];

  sensitivePatterns.forEach(pattern => {
    if (pattern.test(url)) {
      issues.push(`Sensitive data detected in URL: ${pattern.source}`);
    }
  });

  // Check protocol
  const urlObj = new URL(url, window.location.origin);
  if (urlObj.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    issues.push('URL must use HTTPS in production');
  }

  return {
    isSecure: issues.length === 0,
    issues,
  };
}

/**
 * Security headers configuration
 * Recommended security headers for Next.js
 */
export const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

/**
 * Content Security Policy configuration
 */
export const contentSecurityPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || ''],
  'frame-ancestors': ["'none'"],
};
