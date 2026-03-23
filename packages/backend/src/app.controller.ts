import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { ApiInfoDto } from './dto/api-info.dto';
import { HealthDto } from './dto/health.dto';
import { TestDataDto } from './dto/test-data.dto';

@ApiTags('default')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({
    status: 200,
    description: 'Returns basic API information',
    type: ApiInfoDto,
  })
  getRoot(): ApiInfoDto {
    return {
      message: 'AI Trading Platform API',
      status: 'running',
      version: '1.0.0',
    };
  }

  @Get('health')
  @ApiTags('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns the health status of the API',
    type: HealthDto,
  })
  getHealth(): HealthDto {
    return { status: 'healthy' };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint with shared package' })
  @ApiResponse({
    status: 200,
    description: 'Returns test data including shared package greeting',
    type: TestDataDto,
  })
  getTest(): TestDataDto {
    return this.appService.getTestData();
  }
}
