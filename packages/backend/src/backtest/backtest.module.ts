import { Module } from '@nestjs/common';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { IndicatorsModule } from '../indicators/indicators.module';

@Module({
  imports: [MarketDataModule, IndicatorsModule],
  controllers: [BacktestController],
  providers: [BacktestService],
})
export class BacktestModule {}
