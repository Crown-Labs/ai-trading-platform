import { Module } from '@nestjs/common';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { IndicatorEngine } from './engines/indicator.engine';
import { ConditionEngine } from './engines/condition.engine';
import { SignalEngine } from './engines/signal.engine';
import { RiskEngine } from './engines/risk.engine';
import { ExecutionEngine } from './engines/execution.engine';
import { MetricsEngine } from './engines/metrics.engine';

@Module({
  imports: [MarketDataModule, IndicatorsModule],
  controllers: [BacktestController],
  providers: [
    BacktestService,
    IndicatorEngine,
    ConditionEngine,
    SignalEngine,
    RiskEngine,
    ExecutionEngine,
    MetricsEngine,
  ],
  exports: [BacktestService],
})
export class BacktestModule {}
