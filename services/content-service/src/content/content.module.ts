import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { Item } from './entities/item.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { S3Service } from '../services/s3.service';
import { ValidationService } from '../services/validation.service';
import { multerConfig } from '../common/multer.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([Item, MediaAsset]),
        MulterModule.register({
            ...multerConfig,
            storage: undefined, // Use memory storage for S3 uploads
        }),
    ],
    controllers: [ContentController],
    providers: [ContentService, S3Service, ValidationService],
    exports: [ContentService, S3Service, ValidationService],
})
export class ContentModule { }