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
const INITIAL_CAPITAL = 10000;

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

    const { values: indicatorValues, indicator } =
      this.indicatorEngine.autoCompute(candles, inputStrategy);
    const strategy = { ...inputStrategy, indicator };

    const execParams: ExecutionParams = {
      commission: strategy.execution?.commission ?? DEFAULT_COMMISSION,
      slippage: strategy.execution?.slippage ?? DEFAULT_SLIPPAGE,
      leverage: strategy.execution?.leverage ?? DEFAULT_LEVERAGE,
      positionSize: strategy.risk.position_size,
    };

    const useNextBar =
      (strategy.execution?.execution_model ?? 'next_bar') === 'next_bar';

    const trades = this.simulateTrades(
      candles,
      indicatorValues,
      strategy.entry,
      strategy.exit,
      strategy.risk,
      execParams,
      useNextBar,
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
    useNextBar: boolean,
  ): Trade[] {
    const trades: Trade[] = [];
    let tradeId = 0;
    let capital = INITIAL_CAPITAL;

    let longPos: { price: number; time: string } | null = null;
    let shortPos: { price: number; time: string } | null = null;

    let pendingLongEntry = false;
    let pendingLongExit = false;
    let pendingShortEntry = false;
    let pendingShortExit = false;

    const hasShort = (entry.short_condition?.length ?? 0) > 0;
    const shortExitConditions = exit.short_condition ?? exit.condition;

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const timestamp = new Date(candle.timestamp).toISOString();

      // === PHASE 1: Execute pending signals at this bar's open ===
      if (useNextBar) {
        if (pendingLongEntry && !longPos) {
          longPos = { price: candle.open, time: timestamp };
          pendingLongEntry = false;
        }
        if (pendingLongExit && longPos) {
          tradeId++;
          const trade = this.executionEngine.closeLong(
            longPos.price,
            candle.open,
            longPos.time,
            timestamp,
            tradeId,
            execParams,
            capital,
          );
          trades.push(trade);
          capital += trade.pnl;
          longPos = null;
          pendingLongExit = false;
        }
        if (hasShort) {
          if (pendingShortEntry && !shortPos) {
            shortPos = { price: candle.open, time: timestamp };
            pendingShortEntry = false;
          }
          if (pendingShortExit && shortPos) {
            tradeId++;
            const trade = this.executionEngine.closeShort(
              shortPos.price,
              candle.open,
              shortPos.time,
              timestamp,
              tradeId,
              execParams,
              capital,
            );
            trades.push(trade);
            capital += trade.pnl;
            shortPos = null;
            pendingShortExit = false;
          }
        }
      }

      // === PHASE 2: Check intrabar SL/TP using high/low ===
      if (longPos) {
        const sl = this.riskEngine.checkLongStopLoss(
          candle,
          longPos.price,
          risk.stop_loss,
        );
        const tp = this.riskEngine.checkLongTakeProfit(
          candle,
          longPos.price,
          risk.take_profit,
        );
        // SL takes priority over TP
        if (sl.triggered || tp.triggered) {
          const fillPrice = sl.triggered ? sl.fillPrice : tp.fillPrice;
          tradeId++;
          const trade = this.executionEngine.closeLong(
            longPos.price,
            fillPrice,
            longPos.time,
            timestamp,
            tradeId,
            execParams,
            capital,
          );
          trades.push(trade);
          capital += trade.pnl;
          longPos = null;
          pendingLongExit = false;
        }
      }
      if (shortPos) {
        const sl = this.riskEngine.checkShortStopLoss(
          candle,
          shortPos.price,
          risk.stop_loss,
        );
        const tp = this.riskEngine.checkShortTakeProfit(
          candle,
          shortPos.price,
          risk.take_profit,
        );
        if (sl.triggered || tp.triggered) {
          const fillPrice = sl.triggered ? sl.fillPrice : tp.fillPrice;
          tradeId++;
          const trade = this.executionEngine.closeShort(
            shortPos.price,
            fillPrice,
            shortPos.time,
            timestamp,
            tradeId,
            execParams,
            capital,
          );
          trades.push(trade);
          capital += trade.pnl;
          shortPos = null;
          pendingShortExit = false;
        }
      }

      // === PHASE 3: Evaluate signals on this bar's close ===
      // Skip first bar (need previous data for indicators)
      if (i === 0) continue;

      const signals = this.signalEngine.evaluate(
        i,
        indicators,
        entry.condition,
        exit.condition,
        entry.short_condition ?? [],
        shortExitConditions,
      );

      if (useNextBar) {
        // Queue signals for next bar execution
        if (!longPos && signals.longEntry) pendingLongEntry = true;
        if (longPos && signals.longExit) pendingLongExit = true;
        if (hasShort) {
          if (!shortPos && signals.shortEntry) pendingShortEntry = true;
          if (shortPos && signals.shortExit) pendingShortExit = true;
        }
      } else {
        // Same-bar execution (legacy mode)
        if (!longPos && signals.longEntry) {
          longPos = { price: candle.close, time: timestamp };
        }
        if (longPos && signals.longExit) {
          tradeId++;
          const trade = this.executionEngine.closeLong(
            longPos.price,
            candle.close,
            longPos.time,
            timestamp,
            tradeId,
            execParams,
            capital,
          );
          trades.push(trade);
          capital += trade.pnl;
          longPos = null;
        }
        if (hasShort) {
          if (!shortPos && signals.shortEntry) {
            shortPos = { price: candle.close, time: timestamp };
          }
          if (shortPos && signals.shortExit) {
            tradeId++;
            const trade = this.executionEngine.closeShort(
              shortPos.price,
              candle.close,
              shortPos.time,
              timestamp,
              tradeId,
              execParams,
              capital,
            );
            trades.push(trade);
            capital += trade.pnl;
            shortPos = null;
          }
        }
      }
    }

    trades.sort((a, b) => a.entryTime.localeCompare(b.entryTime));
    trades.forEach((t, i) => (t.id = i + 1));

    return trades;
  }
}
