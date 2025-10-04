import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3UploadResult {
    key: string;
    bucket: string;
    url: string;
    etag: string;
}

export interface SignedUrlOptions {
    expiresIn?: number; // seconds
    responseContentType?: string;
    responseContentDisposition?: string;
}

@Injectable()
export class S3Service {
    private readonly logger = new Logger(S3Service.name);
    private readonly s3Client: S3Client;
    private readonly defaultBucket: string;

    constructor(private readonly configService: ConfigService) {
        this.s3Client = new S3Client({
            region: this.configService.get('AWS_REGION', 'us-east-1'),
            credentials: {
                accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
            },
        });

        this.defaultBucket = this.configService.get('S3_BUCKET', 'content-assets');
    }

    async uploadFile(
        key: string,
        buffer: Buffer,
        contentType: string,
        bucket?: string,
    ): Promise<S3UploadResult> {
        const targetBucket = bucket || this.defaultBucket;

        try {
            const command = new PutObjectCommand({
                Bucket: targetBucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                ServerSideEncryption: 'AES256',
                Metadata: {
                    uploadedAt: new Date().toISOString(),
                },
            });

            const result = await this.s3Client.send(command);

            this.logger.log(`File uploaded successfully: ${key} to bucket ${targetBucket}`);

            return {
                key,
                bucket: targetBucket,
                url: `https://${targetBucket}.s3.amazonaws.com/${key}`,
                etag: result.ETag,
            };
        } catch (error) {
            this.logger.error(`Failed to upload file ${key}:`, error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    async getSignedUrl(
        key: string,
        options: SignedUrlOptions = {},
        bucket?: string,
    ): Promise<string> {
        const targetBucket = bucket || this.defaultBucket;
        const expiresIn = options.expiresIn || 3600; // 1 hour default

        try {
            const command = new GetObjectCommand({
                Bucket: targetBucket,
                Key: key,
                ResponseContentType: options.responseContentType,
                ResponseContentDisposition: options.responseContentDisposition,
            });

            const signedUrl = await getSignedUrl(this.s3Client, command, {
                expiresIn,
            });

            this.logger.debug(`Generated signed URL for ${key}, expires in ${expiresIn}s`);
            return signedUrl;
        } catch (error) {
            this.logger.error(`Failed to generate signed URL for ${key}:`, error);
            throw new Error(`Failed to generate signed URL: ${error.message}`);
        }
    }

    async deleteFile(key: string, bucket?: string): Promise<void> {
        const targetBucket = bucket || this.defaultBucket;

        try {
            const command = new DeleteObjectCommand({
                Bucket: targetBucket,
                Key: key,
            });

            await this.s3Client.send(command);
            this.logger.log(`File deleted successfully: ${key} from bucket ${targetBucket}`);
        } catch (error) {
            this.logger.error(`Failed to delete file ${key}:`, error);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    async fileExists(key: string, bucket?: string): Promise<boolean> {
        const targetBucket = bucket || this.defaultBucket;

        try {
            const command = new HeadObjectCommand({
                Bucket: targetBucket,
                Key: key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            if (error.name === 'NotFound') {
                return false;
            }
            this.logger.error(`Error checking file existence ${key}:`, error);
            throw new Error(`Failed to check file existence: ${error.message}`);
        }
    }

    async getFileMetadata(key: string, bucket?: string): Promise<any> {
        const targetBucket = bucket || this.defaultBucket;

        try {
            const command = new HeadObjectCommand({
                Bucket: targetBucket,
                Key: key,
            });

            const result = await this.s3Client.send(command);
            return {
                contentType: result.ContentType,
                contentLength: result.ContentLength,
                lastModified: result.LastModified,
                etag: result.ETag,
                metadata: result.Metadata,
            };
        } catch (error) {
            this.logger.error(`Failed to get file metadata ${key}:`, error);
            throw new Error(`Failed to get file metadata: ${error.message}`);
        }
    }
}