import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import * as mime from 'mime-types';
import { MediaType } from '../content/entities/media-asset.entity';

// Set ffmpeg path - handle both CommonJS and ES module exports
const ffmpegPath = require('ffmpeg-static');
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface ImageProcessingOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    generateThumbnail?: boolean;
    thumbnailSize?: number;
}

export interface VideoProcessingOptions {
    width?: number;
    height?: number;
    quality?: 'low' | 'medium' | 'high';
    generateThumbnail?: boolean;
    thumbnailTime?: number; // seconds
}

export interface AudioProcessingOptions {
    bitrate?: string;
    format?: 'mp3' | 'aac' | 'ogg';
    normalize?: boolean;
}

export interface ProcessedMedia {
    original: Buffer;
    processed?: Buffer;
    thumbnail?: Buffer;
    metadata: {
        width?: number;
        height?: number;
        duration?: number;
        size: number;
        format: string;
        mimeType: string;
    };
}

@Injectable()
export class MediaProcessingService {
    private readonly logger = new Logger(MediaProcessingService.name);
    private readonly maxImageSize: number;
    private readonly maxVideoSize: number;
    private readonly maxAudioSize: number;
    private readonly allowedImageFormats: string[];
    private readonly allowedVideoFormats: string[];
    private readonly allowedAudioFormats: string[];

    constructor(private readonly configService: ConfigService) {
        this.maxImageSize = this.configService.get('MAX_IMAGE_SIZE', 10 * 1024 * 1024); // 10MB
        this.maxVideoSize = this.configService.get('MAX_VIDEO_SIZE', 100 * 1024 * 1024); // 100MB
        this.maxAudioSize = this.configService.get('MAX_AUDIO_SIZE', 50 * 1024 * 1024); // 50MB

        this.allowedImageFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        this.allowedVideoFormats = ['video/mp4', 'video/webm', 'video/quicktime'];
        this.allowedAudioFormats = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac'];
    }

    async processMedia(
        buffer: Buffer,
        mimeType: string,
        mediaType: MediaType,
        options: any = {}
    ): Promise<ProcessedMedia> {
        this.validateMediaFile(buffer, mimeType, mediaType);

        switch (mediaType) {
            case MediaType.IMAGE:
                return await this.processImage(buffer, options);
            case MediaType.VIDEO:
                return await this.processVideo(buffer, options);
            case MediaType.AUDIO:
                return await this.processAudio(buffer, options);
            case MediaType.DOCUMENT:
                return await this.processDocument(buffer, mimeType);
            default:
                throw new BadRequestException(`Unsupported media type: ${mediaType}`);
        }
    }

    private async processImage(
        buffer: Buffer,
        options: ImageProcessingOptions = {}
    ): Promise<ProcessedMedia> {
        try {
            const image = sharp(buffer);
            const metadata = await image.metadata();

            let processed = image;
            let thumbnail: Buffer | undefined;

            // Resize if dimensions specified
            if (options.width || options.height) {
                processed = processed.resize(options.width, options.height, {
                    fit: 'inside',
                    withoutEnlargement: true,
                });
            }

            // Convert format if specified
            if (options.format) {
                switch (options.format) {
                    case 'jpeg':
                        processed = processed.jpeg({ quality: options.quality || 85 });
                        break;
                    case 'png':
                        processed = processed.png({ quality: options.quality || 85 });
                        break;
                    case 'webp':
                        processed = processed.webp({ quality: options.quality || 85 });
                        break;
                }
            }

            // Generate thumbnail if requested
            if (options.generateThumbnail) {
                const thumbnailSize = options.thumbnailSize || 200;
                thumbnail = await sharp(buffer)
                    .resize(thumbnailSize, thumbnailSize, {
                        fit: 'cover',
                        position: 'center',
                    })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            }

            const processedBuffer = await processed.toBuffer();

            return {
                original: buffer,
                processed: processedBuffer,
                thumbnail,
                metadata: {
                    width: metadata.width,
                    height: metadata.height,
                    size: processedBuffer.length,
                    format: metadata.format || 'unknown',
                    mimeType: mime.lookup(metadata.format || '') || 'application/octet-stream',
                },
            };
        } catch (error) {
            this.logger.error('Image processing failed:', error);
            throw new BadRequestException(`Image processing failed: ${error.message}`);
        }
    }

    private async processVideo(
        buffer: Buffer,
        options: VideoProcessingOptions = {}
    ): Promise<ProcessedMedia> {
        return new Promise((resolve, reject) => {
            try {
                const inputPath = `/tmp/input_${Date.now()}.mp4`;
                const outputPath = `/tmp/output_${Date.now()}.mp4`;
                const thumbnailPath = `/tmp/thumb_${Date.now()}.jpg`;

                // Write buffer to temporary file
                require('fs').writeFileSync(inputPath, buffer);

                let command = ffmpeg(inputPath);

                // Apply video processing options
                if (options.width && options.height) {
                    command = command.size(`${options.width}x${options.height}`);
                }

                if (options.quality) {
                    const crf = options.quality === 'low' ? 28 : options.quality === 'medium' ? 23 : 18;
                    command = command.videoCodec('libx264').addOption('-crf', crf.toString());
                }

                command
                    .output(outputPath)
                    .on('end', async () => {
                        try {
                            const processedBuffer = require('fs').readFileSync(outputPath);
                            let thumbnail: Buffer | undefined;

                            // Generate thumbnail if requested
                            if (options.generateThumbnail) {
                                const thumbnailTime = options.thumbnailTime || 1;
                                await new Promise<void>((thumbResolve, thumbReject) => {
                                    ffmpeg(inputPath)
                                        .screenshots({
                                            timestamps: [thumbnailTime],
                                            filename: 'thumb.jpg',
                                            folder: '/tmp',
                                            size: '320x240',
                                        })
                                        .on('end', () => thumbResolve())
                                        .on('error', thumbReject);
                                });
                                thumbnail = require('fs').readFileSync(thumbnailPath);
                            }

                            // Get video metadata
                            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                                if (err) {
                                    reject(new BadRequestException(`Failed to get video metadata: ${err.message}`));
                                    return;
                                }

                                const videoStream = metadata.streams.find(s => s.codec_type === 'video');

                                resolve({
                                    original: buffer,
                                    processed: processedBuffer,
                                    thumbnail,
                                    metadata: {
                                        width: videoStream?.width,
                                        height: videoStream?.height,
                                        duration: metadata.format.duration,
                                        size: processedBuffer.length,
                                        format: 'mp4',
                                        mimeType: 'video/mp4',
                                    },
                                });

                                // Cleanup temporary files
                                this.cleanupTempFiles([inputPath, outputPath, thumbnailPath]);
                            });
                        } catch (error) {
                            reject(new BadRequestException(`Video processing failed: ${error.message}`));
                        }
                    })
                    .on('error', (error) => {
                        this.cleanupTempFiles([inputPath, outputPath, thumbnailPath]);
                        reject(new BadRequestException(`Video processing failed: ${error.message}`));
                    })
                    .run();
            } catch (error) {
                reject(new BadRequestException(`Video processing setup failed: ${error.message}`));
            }
        });
    }

    private async processAudio(
        buffer: Buffer,
        options: AudioProcessingOptions = {}
    ): Promise<ProcessedMedia> {
        return new Promise((resolve, reject) => {
            try {
                const inputPath = `/tmp/audio_input_${Date.now()}`;
                const outputPath = `/tmp/audio_output_${Date.now()}.mp3`;

                // Write buffer to temporary file
                require('fs').writeFileSync(inputPath, buffer);

                let command = ffmpeg(inputPath);

                // Apply audio processing options
                if (options.bitrate) {
                    command = command.audioBitrate(options.bitrate);
                }

                if (options.format) {
                    command = command.audioCodec(options.format === 'mp3' ? 'libmp3lame' : 'aac');
                }

                if (options.normalize) {
                    command = command.audioFilters('loudnorm');
                }

                command
                    .output(outputPath)
                    .on('end', () => {
                        try {
                            const processedBuffer = require('fs').readFileSync(outputPath);

                            // Get audio metadata
                            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                                if (err) {
                                    reject(new BadRequestException(`Failed to get audio metadata: ${err.message}`));
                                    return;
                                }

                                resolve({
                                    original: buffer,
                                    processed: processedBuffer,
                                    metadata: {
                                        duration: metadata.format.duration,
                                        size: processedBuffer.length,
                                        format: options.format || 'mp3',
                                        mimeType: `audio/${options.format || 'mpeg'}`,
                                    },
                                });

                                // Cleanup temporary files
                                this.cleanupTempFiles([inputPath, outputPath]);
                            });
                        } catch (error) {
                            reject(new BadRequestException(`Audio processing failed: ${error.message}`));
                        }
                    })
                    .on('error', (error) => {
                        this.cleanupTempFiles([inputPath, outputPath]);
                        reject(new BadRequestException(`Audio processing failed: ${error.message}`));
                    })
                    .run();
            } catch (error) {
                reject(new BadRequestException(`Audio processing setup failed: ${error.message}`));
            }
        });
    }

    private async processDocument(buffer: Buffer, mimeType: string): Promise<ProcessedMedia> {
        // For documents, we just validate and return metadata
        const format = mime.extension(mimeType) || 'unknown';

        return {
            original: buffer,
            metadata: {
                size: buffer.length,
                format,
                mimeType,
            },
        };
    }

    private validateMediaFile(buffer: Buffer, mimeType: string, mediaType: MediaType): void {
        // Check file size limits
        switch (mediaType) {
            case MediaType.IMAGE:
                if (buffer.length > this.maxImageSize) {
                    throw new BadRequestException(`Image file too large. Maximum size: ${this.maxImageSize / 1024 / 1024}MB`);
                }
                if (!this.allowedImageFormats.includes(mimeType)) {
                    throw new BadRequestException(`Unsupported image format: ${mimeType}`);
                }
                break;
            case MediaType.VIDEO:
                if (buffer.length > this.maxVideoSize) {
                    throw new BadRequestException(`Video file too large. Maximum size: ${this.maxVideoSize / 1024 / 1024}MB`);
                }
                if (!this.allowedVideoFormats.includes(mimeType)) {
                    throw new BadRequestException(`Unsupported video format: ${mimeType}`);
                }
                break;
            case MediaType.AUDIO:
                if (buffer.length > this.maxAudioSize) {
                    throw new BadRequestException(`Audio file too large. Maximum size: ${this.maxAudioSize / 1024 / 1024}MB`);
                }
                if (!this.allowedAudioFormats.includes(mimeType)) {
                    throw new BadRequestException(`Unsupported audio format: ${mimeType}`);
                }
                break;
        }
    }

    private cleanupTempFiles(paths: string[]): void {
        paths.forEach(path => {
            try {
                if (require('fs').existsSync(path)) {
                    require('fs').unlinkSync(path);
                }
            } catch (error) {
                this.logger.warn(`Failed to cleanup temp file ${path}:`, error);
            }
        });
    }

    async generateOptimizedVersions(
        buffer: Buffer,
        mimeType: string,
        mediaType: MediaType
    ): Promise<{ [key: string]: Buffer }> {
        const versions: { [key: string]: Buffer } = {};

        if (mediaType === MediaType.IMAGE) {
            // Generate multiple optimized versions
            const image = sharp(buffer);
            const metadata = await image.metadata();

            // Original optimized
            versions.original = await image
                .jpeg({ quality: 90, progressive: true })
                .toBuffer();

            // Large (1920px max)
            if (metadata.width && metadata.width > 1920) {
                versions.large = await image
                    .resize(1920, null, { withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toBuffer();
            }

            // Medium (800px max)
            versions.medium = await image
                .resize(800, null, { withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();

            // Small (400px max)
            versions.small = await image
                .resize(400, null, { withoutEnlargement: true })
                .jpeg({ quality: 75 })
                .toBuffer();

            // Thumbnail (200px max)
            versions.thumbnail = await image
                .resize(200, 200, { fit: 'cover', position: 'center' })
                .jpeg({ quality: 70 })
                .toBuffer();

            // WebP versions for modern browsers
            versions.webp_large = await sharp(buffer)
                .resize(1920, null, { withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();

            versions.webp_medium = await sharp(buffer)
                .resize(800, null, { withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
        }

        return versions;
    }
}