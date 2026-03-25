import { Injectable, Logger } from '@nestjs/common';
import {
  StrategyDSL,
  BacktestResult,
  Trade,
  OHLCVCandle,
} from '@ai-trading/shared';
import { MarketDataService } from '../market-data/market-data.service';
import { IndicatorEngine } from './engines/indicator.engine';
import { SignalEngine } from './engines/signal.engine';
import { RiskEngine } from './engines/risk.engine';
import { ExecutionEngine, ExecutionParams } from './engines/execution.engine';
import { MetricsEngine } from './engines/metrics.engine';

const DEFAULT_COMMISSION = 0.001;
const DEFAULT_SLIPPAGE = 0.0005;
const DEFAULT_LEVERAGE = 1;

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(
    private readonly marketData: MarketDataService,
    private readonly indicatorEngine: IndicatorEngine,
    private readonly signalEngine: SignalEngine,
    private readonly riskEngine: RiskEngine,
    private readonly executionEngine: ExecutionEngine,
    private readonly metricsEngine: MetricsEngine,
  ) {}

  async runBacktest(inputStrategy: StrategyDSL): Promise<BacktestResult> {
    const startTime = inputStrategy.startDate
      ? new Date(inputStrategy.startDate).getTime()
      : undefined;
    const endTime = inputStrategy.endDate
      ? new Date(inputStrategy.endDate).getTime()
      : undefined;
    const candles = await this.marketData.getCandles(
      inputStrategy.market.symbol,
      inputStrategy.market.timeframe,
      startTime,
      endTime,
      startTime ? undefined : 500,
    );

    // Auto-detect + inject missing indicators from conditions, then compute
    const { values: indicatorValues, indicator } =
      this.indicatorEngine.autoCompute(candles, inputStrategy);
    const strategy = { ...inputStrategy, indicator };

    const execParams: ExecutionParams = {
      commission: strategy.execution?.commission ?? DEFAULT_COMMISSION,
      slippage: strategy.execution?.slippage ?? DEFAULT_SLIPPAGE,
      leverage: strategy.execution?.leverage ?? DEFAULT_LEVERAGE,
      positionSize: strategy.risk.position_size,
    };

    const trades = this.simulateTrades(
      candles,
      indicatorValues,
      strategy.entry,
      strategy.exit,
      strategy.risk,
      execParams,
    );

    const metrics = this.metricsEngine.calculate(trades);

    return { strategy, trades, metrics };
  }

  private simulateTrades(
    candles: OHLCVCandle[],
    indicators: Record<string, number[]>,
    entry: { condition: string[]; short_condition?: string[] },
    exit: { condition: string[]; short_condition?: string[] },
    risk: { stop_loss: number; take_profit: number; position_size: number },
    execParams: ExecutionParams,
  ): Trade[] {
    const trades: Trade[] = [];
    let tradeId = 0;

    let longEntry: { price: number; time: string } | null = null;
    let shortEntry: { price: number; time: string } | null = null;

    const hasShort = (entry.short_condition?.length ?? 0) > 0;
    const shortExitConditions = exit.short_condition ?? exit.condition;

    for (let i = 1; i < candles.length; i++) {
      const currentPrice = candles[i].close;
      const timestamp = new Date(candles[i].timestamp).toISOString();

      const signals = this.signalEngine.evaluate(
        i,
        indicators,
        entry.condition,
        exit.condition,
        entry.short_condition ?? [],
        shortExitConditions,
      );

      // --- LONG ---
      if (!longEntry) {
        if (signals.longEntry) {
          longEntry = { price: currentPrice, time: timestamp };
        }
      } else {
        const exitSignal =
          signals.longExit ||
          this.riskEngine.checkLongStopLoss(
            currentPrice,
            longEntry.price,
            risk.stop_loss,
          ) ||
          this.riskEngine.checkLongTakeProfit(
            currentPrice,
            longEntry.price,
            risk.take_profit,
          );

        if (exitSignal) {
          tradeId++;
          trades.push(
            this.executionEngine.closeLong(
              longEntry.price,
              currentPrice,
              longEntry.time,
              timestamp,
              tradeId,
              execParams,
            ),
          );
          longEntry = null;
        }
      }

      // --- SHORT ---
      if (hasShort) {
        if (!shortEntry) {
          if (signals.shortEntry) {
            shortEntry = { price: currentPrice, time: timestamp };
          }
        } else {
          const exitSignal =
            signals.shortExit ||
            this.riskEngine.checkShortStopLoss(
              currentPrice,
              shortEntry.price,
              risk.stop_loss,
            ) ||
            this.riskEngine.checkShortTakeProfit(
              currentPrice,
              shortEntry.price,
              risk.take_profit,
            );

          if (exitSignal) {
            tradeId++;
            trades.push(
              this.executionEngine.closeShort(
                shortEntry.price,
                currentPrice,
                shortEntry.time,
                timestamp,
                tradeId,
                execParams,
              ),
            );
            shortEntry = null;
          }
        }
      }
    }

    trades.sort((a, b) => a.entryTime.localeCompare(b.entryTime));
    trades.forEach((t, i) => (t.id = i + 1));

    return trades;
  }
}
