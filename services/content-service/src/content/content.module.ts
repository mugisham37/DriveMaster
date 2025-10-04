import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { Item } from './entities/item.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { WorkflowHistory } from './entities/workflow-history.entity';
import { S3Service } from '../services/s3.service';
import { ValidationService } from '../services/validation.service';
import { NotificationService } from '../services/notification.service';
import { MediaProcessingService } from '../services/media-processing.service';
import { CDNService } from '../services/cdn.service';
import { MediaAssetService } from '../services/media-asset.service';
import { BulkOperationsService } from '../services/bulk-operations.service';
import { SearchModule } from '../search/search.module';
import { multerConfig } from '../common/multer.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([Item, MediaAsset, WorkflowHistory]),
        MulterModule.register({
            ...multerConfig,
            storage: undefined, // Use memory storage for S3 uploads
        }),
        ScheduleModule.forRoot(),
        forwardRef(() => SearchModule),
    ],
    controllers: [ContentController],
    providers: [
        ContentService,
        S3Service,
        ValidationService,
        NotificationService,
        MediaProcessingService,
        CDNService,
        MediaAssetService,
        BulkOperationsService,
    ],
    exports: [
        ContentService,
        S3Service,
        ValidationService,
        NotificationService,
        MediaProcessingService,
        CDNService,
        MediaAssetService,
        BulkOperationsService,
    ],
})
export class ContentModule { }