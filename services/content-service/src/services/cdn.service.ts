import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CDNConfig {
    provider: 'cloudfront' | 'cloudflare' | 'custom';
    baseUrl: string;
    distributionId?: string;
    zoneId?: string;
    apiKey?: string;
    secretKey?: string;
}

export interface CacheInvalidationResult {
    success: boolean;
    invalidationId?: string;
    error?: string;
}

@Injectable()
export class CDNService {
    private readonly logger = new Logger(CDNService.name);
    private readonly config: CDNConfig;

    constructor(private readonly configService: ConfigService) {
        this.config = {
            provider: this.configService.get('CDN_PROVIDER', 'cloudfront') as 'cloudfront' | 'cloudflare' | 'custom',
            baseUrl: this.configService.get('CDN_BASE_URL', ''),
            distributionId: this.configService.get('CDN_DISTRIBUTION_ID'),
            zoneId: this.configService.get('CDN_ZONE_ID'),
            apiKey: this.configService.get('CDN_API_KEY'),
            secretKey: this.configService.get('CDN_SECRET_KEY'),
        };
    }

    /**
     * Generate CDN URL for a given S3 key
     */
    generateCDNUrl(s3Key: string, version?: string): string {
        if (!this.config.baseUrl) {
            this.logger.warn('CDN base URL not configured, returning S3 URL');
            return `https://s3.amazonaws.com/${this.configService.get('S3_BUCKET')}/${s3Key}`;
        }

        let url = `${this.config.baseUrl}/${s3Key}`;

        // Add version parameter for cache busting
        if (version) {
            url += `?v=${version}`;
        }

        return url;
    }

    /**
     * Generate responsive image URLs for different sizes
     */
    generateResponsiveUrls(s3Key: string, version?: string): {
        original: string;
        large: string;
        medium: string;
        small: string;
        thumbnail: string;
        webp_large?: string;
        webp_medium?: string;
    } {
        const baseKey = s3Key.replace(/\.[^/.]+$/, ''); // Remove extension
        const extension = s3Key.split('.').pop();

        return {
            original: this.generateCDNUrl(s3Key, version),
            large: this.generateCDNUrl(`${baseKey}_large.${extension}`, version),
            medium: this.generateCDNUrl(`${baseKey}_medium.${extension}`, version),
            small: this.generateCDNUrl(`${baseKey}_small.${extension}`, version),
            thumbnail: this.generateCDNUrl(`${baseKey}_thumbnail.${extension}`, version),
            webp_large: this.generateCDNUrl(`${baseKey}_webp_large.webp`, version),
            webp_medium: this.generateCDNUrl(`${baseKey}_webp_medium.webp`, version),
        };
    }

    /**
     * Invalidate CDN cache for specific paths
     */
    async invalidateCache(paths: string[]): Promise<CacheInvalidationResult> {
        if (!this.config.baseUrl) {
            this.logger.warn('CDN not configured, skipping cache invalidation');
            return { success: true };
        }

        try {
            switch (this.config.provider) {
                case 'cloudfront':
                    return await this.invalidateCloudFront(paths);
                case 'cloudflare':
                    return await this.invalidateCloudflare(paths);
                case 'custom':
                    return await this.invalidateCustomCDN(paths);
                default:
                    throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
            }
        } catch (error) {
            this.logger.error('CDN cache invalidation failed:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    private async invalidateCloudFront(paths: string[]): Promise<CacheInvalidationResult> {
        if (!this.config.distributionId) {
            throw new Error('CloudFront distribution ID not configured');
        }

        // Import AWS SDK dynamically to avoid loading if not needed
        const { CloudFrontClient, CreateInvalidationCommand } = await import('@aws-sdk/client-cloudfront');

        const client = new CloudFrontClient({
            region: this.configService.get('AWS_REGION', 'us-east-1'),
            credentials: {
                accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
            },
        });

        const command = new CreateInvalidationCommand({
            DistributionId: this.config.distributionId,
            InvalidationBatch: {
                Paths: {
                    Quantity: paths.length,
                    Items: paths.map(path => `/${path}`),
                },
                CallerReference: `invalidation-${Date.now()}`,
            },
        });

        const result = await client.send(command);

        this.logger.log(`CloudFront invalidation created: ${result.Invalidation?.Id}`);

        return {
            success: true,
            invalidationId: result.Invalidation?.Id,
        };
    }

    private async invalidateCloudflare(paths: string[]): Promise<CacheInvalidationResult> {
        if (!this.config.zoneId || !this.config.apiKey) {
            throw new Error('Cloudflare zone ID or API key not configured');
        }

        const urls = paths.map(path => `${this.config.baseUrl}/${path}`);

        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: urls,
            }),
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(`Cloudflare invalidation failed: ${JSON.stringify(result.errors)}`);
        }

        this.logger.log(`Cloudflare cache purged for ${urls.length} URLs`);

        return {
            success: true,
            invalidationId: result.result?.id,
        };
    }

    private async invalidateCustomCDN(paths: string[]): Promise<CacheInvalidationResult> {
        // Implement custom CDN invalidation logic here
        // This is a placeholder for custom CDN providers
        this.logger.log(`Custom CDN invalidation requested for ${paths.length} paths`);

        return {
            success: true,
        };
    }

    /**
     * Generate cache control headers based on content type
     */
    getCacheControlHeaders(mediaType: string, isPublic: boolean = true): { [key: string]: string } {
        const headers: { [key: string]: string } = {};

        // Set cache control based on media type
        if (mediaType.startsWith('image/')) {
            // Images can be cached for longer periods
            headers['Cache-Control'] = isPublic
                ? 'public, max-age=31536000, immutable' // 1 year
                : 'private, max-age=3600'; // 1 hour
        } else if (mediaType.startsWith('video/') || mediaType.startsWith('audio/')) {
            // Media files can be cached for moderate periods
            headers['Cache-Control'] = isPublic
                ? 'public, max-age=2592000' // 30 days
                : 'private, max-age=3600'; // 1 hour
        } else {
            // Documents and other files
            headers['Cache-Control'] = isPublic
                ? 'public, max-age=86400' // 1 day
                : 'private, max-age=1800'; // 30 minutes
        }

        // Add ETag for better caching
        headers['ETag'] = `"${Date.now()}"`;

        return headers;
    }

    /**
     * Check if CDN is properly configured
     */
    isConfigured(): boolean {
        return !!(this.config.baseUrl && (
            (this.config.provider === 'cloudfront' && this.config.distributionId) ||
            (this.config.provider === 'cloudflare' && this.config.zoneId && this.config.apiKey) ||
            this.config.provider === 'custom'
        ));
    }

    /**
     * Get CDN configuration status
     */
    getStatus(): {
        configured: boolean;
        provider: string;
        baseUrl: string;
        features: string[];
    } {
        const features: string[] = [];

        if (this.config.distributionId) features.push('CloudFront Invalidation');
        if (this.config.zoneId && this.config.apiKey) features.push('Cloudflare Purging');
        if (this.config.baseUrl) features.push('CDN URLs');

        return {
            configured: this.isConfigured(),
            provider: this.config.provider,
            baseUrl: this.config.baseUrl,
            features,
        };
    }
}