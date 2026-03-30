import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsageService } from './usage.service';

@ApiTags('Admin - Usage')
@ApiBearerAuth()
@Controller('admin/usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({ summary: 'Get usage logs (optionally filter by user)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date string' })
  async getUsage(
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (userId) {
      return this.usageService.getUsageByUser(userId, fromDate, toDate);
    }
    // Return summary if no userId
    return this.usageService.getUsageSummary(undefined, fromDate, toDate);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated usage summary' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getSummary(
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.usageService.getUsageSummary(userId, fromDate, toDate);
  }
}
