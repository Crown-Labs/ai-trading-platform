import { ApiProperty } from '@nestjs/swagger';

class MarketDto {
  @ApiProperty({ example: 'binance' })
  exchange: string;

  @ApiProperty({ example: 'BTCUSDT' })
  symbol: string;

  @ApiProperty({ example: '1h' })
  timeframe: string;
}

class IndicatorDto {
  @ApiProperty({ example: 14, required: false })
  rsi?: number;

  @ApiProperty({ example: 12, required: false })
  ema_fast?: number;

  @ApiProperty({ example: 26, required: false })
  ema_slow?: number;
}

class ConditionDto {
  @ApiProperty({ example: ['rsi < 30'], type: [String] })
  condition: string[];
}

class RiskDto {
  @ApiProperty({ example: 2 })
  stop_loss: number;

  @ApiProperty({ example: 5 })
  take_profit: number;

  @ApiProperty({ example: 1 })
  position_size: number;
}

class ExecutionParamsDto {
  @ApiProperty({ example: 0.001, description: 'Commission as decimal (0.001 = 0.1%)' })
  commission: number;

  @ApiProperty({ example: 0.0005, description: 'Slippage as decimal (0.0005 = 0.05%)' })
  slippage: number;

  @ApiProperty({ example: 1, description: 'Leverage multiplier (1 = spot)' })
  leverage: number;
}

export class StrategyDSLDto {
  @ApiProperty({ example: 'BTCUSDT RSI(14) Strategy' })
  name: string;

  @ApiProperty({ type: MarketDto })
  market: MarketDto;

  @ApiProperty({ type: IndicatorDto })
  indicator: IndicatorDto;

  @ApiProperty({ type: ConditionDto })
  entry: ConditionDto;

  @ApiProperty({ type: ConditionDto })
  exit: ConditionDto;

  @ApiProperty({ type: RiskDto })
  risk: RiskDto;

  @ApiProperty({ type: ExecutionParamsDto, required: false })
  execution?: ExecutionParamsDto;
}

export class ParseStrategyDto {
  @ApiProperty({
    example:
      'Buy BTC when RSI is below 30, sell when RSI is above 70, stop loss 2%, take profit 5%',
  })
  text: string;
}

export class ParseStrategyResponseDto {
  @ApiProperty({ type: StrategyDSLDto })
  strategy: StrategyDSLDto;
}

export class RunBacktestDto {
  @ApiProperty({ type: StrategyDSLDto })
  strategy: StrategyDSLDto;
}

class TradeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  entryTime: string;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z' })
  exitTime: string;

  @ApiProperty({ example: 42000 })
  entryPrice: number;

  @ApiProperty({ example: 43000 })
  exitPrice: number;

  @ApiProperty({ example: 'long' })
  side: string;

  @ApiProperty({ example: 150.25 })
  pnl: number;

  @ApiProperty({ example: '+1.50%' })
  pnlPercent: string;

  @ApiProperty({ example: 20.0 })
  fees: number;

  @ApiProperty({ example: true })
  isWin: boolean;
}

class BacktestMetricsDto {
  @ApiProperty({ example: 10 })
  totalTrades: number;

  @ApiProperty({ example: 60 })
  winRate: number;

  @ApiProperty({ example: 15.5 })
  totalReturn: number;

  @ApiProperty({ example: 5.2 })
  maxDrawdown: number;

  @ApiProperty({ example: 1.2 })
  sharpeRatio: number;

  @ApiProperty({ example: 1.85 })
  profitFactor: number;

  @ApiProperty({ example: 42.5 })
  totalFees: number;
}

export class BacktestResultDto {
  @ApiProperty({ type: StrategyDSLDto })
  strategy: StrategyDSLDto;

  @ApiProperty({ type: [TradeDto] })
  trades: TradeDto[];

  @ApiProperty({ type: BacktestMetricsDto })
  metrics: BacktestMetricsDto;
}
