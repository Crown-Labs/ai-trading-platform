import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarketDataModule } from './market-data/market-data.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { BacktestModule } from './backtest/backtest.module';

import { AiModule } from './ai/ai.module';

@Module({
  imports: [MarketDataModule, IndicatorsModule, BacktestModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
