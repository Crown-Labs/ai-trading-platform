import { Injectable } from '@nestjs/common';
import { greeting } from '@ai-trading/shared';
import { TestDataDto } from './dto/test-data.dto';

@Injectable()
export class AppService {
  getTestData(): TestDataDto {
    return {
      data: 'Hello from NestJS API!',
      greeting: greeting,
      timestamp: new Date().toISOString(),
    };
  }
}
