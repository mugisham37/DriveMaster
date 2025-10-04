import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ContentRecommendationService } from './content-recommendation.service';
import { ContentTaggingService } from './content-tagging.service';
import { SearchIntegrationService } from './search-integration.service';
import { Item } from '../content/entities/item.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Item]),
        ElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                node: configService.get('ELASTICSEARCH_NODE', 'http://localhost:9200'),
                auth: {
                    username: configService.get('ELASTICSEARCH_USERNAME'),
                    password: configService.get('ELASTICSEARCH_PASSWORD'),
                },
                tls: {
                    rejectUnauthorized: configService.get('NODE_ENV') === 'production',
                },
                maxRetries: 3,
                requestTimeout: 60000,
                sniffOnStart: true,
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [SearchService, ContentRecommendationService, ContentTaggingService, SearchIntegrationService],
    controllers: [SearchController],
    exports: [SearchService, ContentRecommendationService, ContentTaggingService, SearchIntegrationService],
})
export class SearchModule { }