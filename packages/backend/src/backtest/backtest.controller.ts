import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BacktestService } from './backtest.service';
import { RunBacktestDto, BacktestResultDto } from '../dto';

@ApiTags('backtest')
@Controller('backtest')
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run a backtest with a strategy DSL' })
  @ApiResponse({
    status: 201,
    description: 'Backtest completed successfully',
    type: BacktestResultDto,
  })
  async runBacktest(@Body() dto: RunBacktestDto): Promise<BacktestResultDto> {
    return this.backtestService.runBacktest(dto.strategy) as any;
  }
}
