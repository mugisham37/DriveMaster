# Media Asset Management System

This document describes the enhanced media asset management system implemented for the Content Service.

## Features

### 1. S3/GCS Integration for File Storage

- **Secure Upload**: Files are uploaded directly to S3 with server-side encryption
- **Signed URLs**: Generate time-limited signed URLs for secure access
- **Bucket Management**: Configurable bucket settings with proper IAM policies
- **Metadata Storage**: Rich metadata storage including file size, type, and custom attributes

### 2. Image Processing and Optimization

- **Automatic Resizing**: Generate multiple sizes (original, large, medium, small, thumbnail)
- **Format Conversion**: Convert images to optimized formats (JPEG, PNG, WebP)
- **Quality Control**: Configurable quality settings for different use cases
- **Thumbnail Generation**: Automatic thumbnail creation with customizable sizes
- **Progressive JPEG**: Generate progressive JPEGs for better loading experience

### 3. Video Processing

- **Format Standardization**: Convert videos to web-optimized MP4 format
- **Resolution Scaling**: Resize videos to standard resolutions (1080p, 720p, 480p)
- **Thumbnail Extraction**: Extract thumbnails at specified timestamps
- **Quality Optimization**: Configurable quality settings (low, medium, high)
- **Metadata Extraction**: Extract video duration, dimensions, and codec information

### 4. Audio Processing

- **Format Conversion**: Convert audio to web-friendly formats (MP3, AAC, OGG)
- **Bitrate Optimization**: Configurable bitrate settings for quality vs. size
- **Audio Normalization**: Normalize audio levels for consistent playback
- **Metadata Extraction**: Extract duration and audio properties

### 5. CDN Integration for Global Content Delivery

- **Multi-Provider Support**: CloudFront, Cloudflare, and custom CDN providers
- **Cache Invalidation**: Automatic cache invalidation when content changes
- **Responsive URLs**: Generate URLs for different image sizes and formats
- **Cache Control**: Intelligent cache headers based on content type
- **Global Distribution**: Serve content from edge locations worldwide

### 6. Media Asset Versioning

- **Version Tracking**: Track changes to media assets with version numbers
- **Rollback Support**: Ability to revert to previous versions (when implemented)
- **Audit Trail**: Complete history of media asset changes
- **Conflict Resolution**: Handle concurrent updates with optimistic locking

### 7. Cleanup Processes

- **Scheduled Cleanup**: Automatic cleanup of inactive assets via cron jobs
- **Retention Policies**: Configurable retention periods for different asset types
- **Orphan Detection**: Identify and clean up orphaned files in S3
- **Storage Analytics**: Track storage usage and costs
- **Manual Cleanup**: Admin endpoints for manual cleanup operations

## API Endpoints

### Media Upload

```http
POST /content/items/{itemId}/media
Content-Type: multipart/form-data

{
  "file": <binary>,
  "mediaType": "image",
  "alt": "Description",
  "caption": "Caption text",
  "processingOptions": {
    "generateThumbnail": true,
    "generateResponsiveVersions": true,
    "quality": "high"
  }
}
```

### Get Media with URLs

```http
GET /content/media/{id}/urls

Response:
{
  "id": "uuid",
  "filename": "image.jpg",
  "mediaType": "image",
  "urls": {
    "original": "https://cdn.example.com/image.jpg",
    "large": "https://cdn.example.com/image_large.jpg",
    "medium": "https://cdn.example.com/image_medium.jpg",
    "small": "https://cdn.example.com/image_small.jpg",
    "thumbnail": "https://cdn.example.com/image_thumbnail.jpg",
    "webp_large": "https://cdn.example.com/image_webp_large.webp",
    "webp_medium": "https://cdn.example.com/image_webp_medium.webp"
  }
}
```

### Bulk Upload

```http
POST /content/items/{itemId}/media/bulk-upload
Content-Type: multipart/form-data

{
  "files": [<binary>, <binary>, ...],
  "mediaType": "image",
  "processingOptions": {
    "generateThumbnail": true,
    "quality": "medium"
  }
}
```

### Storage Statistics

```http
GET /content/media/statistics

Response:
{
  "totalAssets": 1500,
  "totalSize": 2147483648,
  "activeAssets": 1450,
  "inactiveAssets": 50,
  "byMediaType": {
    "image": { "count": 1200, "size": 1610612736 },
    "video": { "count": 200, "size": 536870912 },
    "audio": { "count": 100, "size": 104857600 }
  }
}
```

### Cleanup Operations

```http
POST /content/media/cleanup

Response:
{
  "deletedAssets": 25,
  "deletedFiles": 125,
  "totalSizeFreed": 52428800,
  "errors": []
}
```

## Configuration

### Environment Variables

```bash
# S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=content-assets

# CDN Configuration
CDN_PROVIDER=cloudfront
CDN_BASE_URL=https://d1234567890.cloudfront.net
CDN_DISTRIBUTION_ID=E1234567890ABC

# Processing Limits
MAX_IMAGE_SIZE=10485760  # 10MB
MAX_VIDEO_SIZE=104857600  # 100MB
MAX_AUDIO_SIZE=52428800  # 50MB

# Cleanup Configuration
MEDIA_RETENTION_DAYS=365
ENABLE_AUTO_CLEANUP=true
```

### S3 Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowContentServiceAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:user/content-service"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::content-assets",
        "arn:aws:s3:::content-assets/*"
      ]
    }
  ]
}
```

### CloudFront Distribution

```yaml
# CloudFormation template snippet
CloudFrontDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Origins:
        - Id: S3Origin
          DomainName: !GetAtt S3Bucket.DomainName
          S3OriginConfig:
            OriginAccessIdentity: !Sub "origin-access-identity/cloudfront/${OriginAccessIdentity}"
      DefaultCacheBehavior:
        TargetOriginId: S3Origin
        ViewerProtocolPolicy: redirect-to-https
        CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad # Managed-CachingOptimized
        Compress: true
      Enabled: true
      HttpVersion: http2
      PriceClass: PriceClass_100
```

## Processing Pipeline

### Image Processing Flow

1. **Upload**: Receive multipart file upload
2. **Validation**: Check file size, format, and metadata
3. **Processing**:
   - Resize to multiple dimensions
   - Convert to optimized formats
   - Generate thumbnails
   - Create WebP versions
4. **Storage**: Upload all versions to S3
5. **Database**: Store metadata and file references
6. **CDN**: Generate CDN URLs for all versions

### Video Processing Flow

1. **Upload**: Receive video file
2. **Validation**: Check file size and format
3. **Processing**:
   - Convert to MP4 format
   - Resize to target resolution
   - Extract thumbnail frames
   - Optimize for web streaming
4. **Storage**: Upload processed video and thumbnails
5. **Database**: Store metadata including duration and dimensions
6. **CDN**: Generate streaming-optimized URLs

## Monitoring and Maintenance

### Scheduled Tasks

- **Daily Cleanup**: Remove inactive assets older than retention period
- **Weekly Analytics**: Generate storage usage reports
- **Monthly Optimization**: Identify and optimize frequently accessed content

### Metrics to Monitor

- **Storage Usage**: Total size and growth rate
- **Processing Time**: Average time for different media types
- **Error Rates**: Failed uploads and processing errors
- **CDN Performance**: Cache hit rates and bandwidth usage
- **Cost Tracking**: S3 storage and transfer costs

### Alerts

- **High Error Rate**: > 5% processing failures
- **Storage Growth**: > 20% monthly increase
- **Processing Delays**: > 30 seconds average processing time
- **CDN Issues**: < 90% cache hit rate

## Security Considerations

### Access Control

- **IAM Policies**: Least privilege access for S3 operations
- **Signed URLs**: Time-limited access to media files
- **CORS Configuration**: Proper CORS settings for web uploads
- **Content Validation**: Strict validation of file types and content

### Data Protection

- **Encryption**: Server-side encryption for all stored files
- **Backup Strategy**: Regular backups of metadata and critical assets
- **Audit Logging**: Complete audit trail of all media operations
- **Compliance**: GDPR-compliant data handling and deletion

## Performance Optimization

### Caching Strategy

- **CDN Caching**: Long-term caching for immutable assets
- **Browser Caching**: Appropriate cache headers for different content types
- **Database Caching**: Cache frequently accessed metadata
- **Processing Cache**: Cache processed versions to avoid reprocessing

### Optimization Techniques

- **Lazy Loading**: Load images on demand
- **Progressive Enhancement**: Serve WebP to supporting browsers
- **Responsive Images**: Serve appropriate sizes based on device
- **Preloading**: Preload critical above-the-fold images

## Troubleshooting

### Common Issues

1. **Upload Failures**
   - Check file size limits
   - Verify S3 permissions
   - Check network connectivity

2. **Processing Errors**
   - Verify FFmpeg installation
   - Check temporary disk space
   - Validate input file formats

3. **CDN Issues**
   - Verify distribution configuration
   - Check invalidation status
   - Monitor cache hit rates

4. **Performance Problems**
   - Monitor processing queue length
   - Check S3 transfer speeds
   - Optimize image sizes and formats

### Debug Commands

```bash
# Check S3 connectivity
aws s3 ls s3://content-assets/

# Test image processing
curl -X POST /content/items/{id}/media \
  -F "file=@test.jpg" \
  -F "mediaType=image"

# Check cleanup status
curl -X GET /content/media/statistics

# Manual cleanup
curl -X POST /content/media/cleanup
```
