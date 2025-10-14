import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ContentModule } from './content/content.module';
import { SearchModule } from './search/search.module';
import { SecurityModule } from './security/security.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        DatabaseModule,
        SecurityModule,
        ContentModule,
        SearchModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }