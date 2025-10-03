import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST', 'localhost'),
                port: configService.get<number>('DB_PORT', 5432),
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD', 'password'),
                database: configService.get<string>('DB_NAME', 'adaptive_learning'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
                logging: configService.get<boolean>('DB_LOGGING', false),
                ssl: configService.get<boolean>('DB_SSL', false),
            }),
            inject: [ConfigService],
        }),
        RedisModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                type: 'single',
                url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
                options: {
                    retryDelayOnFailover: 100,
                    enableReadyCheck: false,
                    maxRetriesPerRequest: null,
                },
            }),
            inject: [ConfigService],
        }),
        AuthModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AppModule { }