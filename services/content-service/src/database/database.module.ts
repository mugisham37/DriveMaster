import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Item } from '../content/entities/item.entity';
import { MediaAsset } from '../content/entities/media-asset.entity';
import { WorkflowHistory } from '../content/entities/workflow-history.entity';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DATABASE_HOST', 'localhost'),
                port: configService.get('DATABASE_PORT', 5432),
                username: configService.get('DATABASE_USERNAME', 'postgres'),
                password: configService.get('DATABASE_PASSWORD', 'password'),
                database: configService.get('DATABASE_NAME', 'content_service'),
                entities: [Item, MediaAsset, WorkflowHistory],
                synchronize: configService.get('NODE_ENV') !== 'production',
                logging: configService.get('NODE_ENV') === 'development',
                ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
            }),
            inject: [ConfigService],
        }),
    ],
})
export class DatabaseModule { }