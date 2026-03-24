import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarketDataModule } from './market-data/market-data.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { BacktestModule } from './backtest/backtest.module';
import { StrategyModule } from './strategy/strategy.module';

@Module({
  imports: [MarketDataModule, IndicatorsModule, BacktestModule, StrategyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
