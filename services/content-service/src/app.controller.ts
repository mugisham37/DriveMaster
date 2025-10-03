import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get('health')
    getHealth() {
        return {
            status: 'healthy',
            service: 'content-service',
            timestamp: new Date().toISOString(),
        };
    }
}