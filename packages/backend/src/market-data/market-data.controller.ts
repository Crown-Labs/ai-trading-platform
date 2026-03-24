import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MarketDataService } from './market-data.service';

@ApiTags('market-data')
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('candles')
  @ApiOperation({ summary: 'Fetch OHLCV candle data from Binance' })
  @ApiQuery({ name: 'symbol', example: 'BTCUSDT' })
  @ApiQuery({ name: 'interval', example: '1h' })
  @ApiQuery({ name: 'limit', example: 500, required: false })
  @ApiResponse({ status: 200, description: 'Array of OHLCV candles' })
  async getCandles(
    @Query('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('limit') limit?: number,
  ) {
    return this.marketDataService.getCandles(
      symbol,
      interval,
      limit ? Number(limit) : 500,
    );
  }
}
