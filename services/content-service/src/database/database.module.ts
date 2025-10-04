import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Item } from '../content/entities/item.entity';
import { MediaAsset } from '../content/entities/media-asset.entity';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DB_HOST', 'localhost'),
                port: configService.get('DB_PORT', 5432),
                username: configService.get('DB_USERNAME', 'postgres'),
                password: configService.get('DB_PASSWORD', 'password'),
                database: configService.get('DB_NAME', 'adaptive_learning'),
                entities: [Item, MediaAsset],
                synchronize: configService.get('NODE_ENV') !== 'production',
                logging: configService.get('NODE_ENV') === 'development',
                ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
            }),
            inject: [ConfigService],
        }),
    ],
})
export class DatabaseModule { }