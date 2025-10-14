import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const multerConfig: MulterOptions = {
    storage: memoryStorage(), // Use memory storage for S3 uploads
    fileFilter: (_req, file, callback) => {
        // Allow images, videos, audio, and documents
        const allowedMimeTypes = [
            // Images
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            // Videos
            'video/mp4',
            'video/webm',
            'video/ogg',
            // Audio
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(
                new BadRequestException(
                    `Unsupported file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`
                ),
                false
            );
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
};