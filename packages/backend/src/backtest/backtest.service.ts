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
    const strategy = this.preprocessDSL(inputStrategy);
    const startTime = strategy.startDate
      ? new Date(strategy.startDate).getTime()
      : undefined;
    const endTime = strategy.endDate
      ? new Date(strategy.endDate).getTime()
      : undefined;
    const candles = await this.marketData.getCandles(
      strategy.market.symbol,
      strategy.market.timeframe,
      startTime,
      endTime,
      startTime ? undefined : 500,
    );

    const indicatorValues = this.indicatorEngine.compute(
      candles,
      strategy.indicator,
    );

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

  private extractVariables(conditions: string[]): Set<string> {
    const vars = new Set<string>();
    const KNOWN_VARS = [
      'rsi', 'ema_fast', 'ema_slow', 'sma', 'adx', 'atr',
      'macd', 'macd_signal', 'macd_histogram',
      'bb_upper', 'bb_middle', 'bb_lower',
      'stoch_k', 'stoch_d',
      'close', 'volume',
    ];
    for (const cond of conditions) {
      for (const v of KNOWN_VARS) {
        if (new RegExp(`\\b${v}\\b`).test(cond)) {
          vars.add(v);
        }
      }
      const crossMatches = cond.match(
        /cross(?:over|under)\((\w+),\s*(\w+)\)/gi,
      );
      if (crossMatches) {
        crossMatches.forEach((m) => {
          const args = m.match(/\((\w+),\s*(\w+)\)/);
          if (args) {
            vars.add(args[1]);
            vars.add(args[2]);
          }
        });
      }
    }
    return vars;
  }

  private preprocessDSL(strategy: StrategyDSL): StrategyDSL {
    const allConditions = [
      ...(strategy.entry?.condition ?? []),
      ...(strategy.entry?.short_condition ?? []),
      ...(strategy.exit?.condition ?? []),
      ...(strategy.exit?.short_condition ?? []),
    ];
    const usedVars = this.extractVariables(allConditions);
    const ind = { ...(strategy.indicator ?? {}) };

    const defaults: Record<string, number> = {
      rsi: 14,
      ema_fast: 20,
      ema_slow: 200,
      sma: 50,
      adx: 14,
      atr: 14,
    };

    for (const [key, defaultPeriod] of Object.entries(defaults)) {
      if (usedVars.has(key) && (ind as any)[key] == null) {
        this.logger.log(
          `Auto-injecting missing indicator: ${key}=${defaultPeriod}`,
        );
        (ind as any)[key] = defaultPeriod;
      }
    }

    if (
      (usedVars.has('macd') ||
        usedVars.has('macd_signal') ||
        usedVars.has('macd_histogram')) &&
      !ind.macd
    ) {
      this.logger.log(
        'Auto-injecting missing indicator: macd={fast:12,slow:26,signal:9}',
      );
      ind.macd = { fast: 12, slow: 26, signal: 9 };
    }

    if (
      (usedVars.has('bb_upper') ||
        usedVars.has('bb_middle') ||
        usedVars.has('bb_lower')) &&
      !ind.bbands
    ) {
      this.logger.log(
        'Auto-injecting missing indicator: bbands={period:20,stddev:2}',
      );
      ind.bbands = { period: 20, stddev: 2 };
    }

    if (
      (usedVars.has('stoch_k') || usedVars.has('stoch_d')) &&
      !ind.stoch
    ) {
      this.logger.log(
        'Auto-injecting missing indicator: stoch={kPeriod:14,dPeriod:3}',
      );
      ind.stoch = { kPeriod: 14, dPeriod: 3 };
    }

    return { ...strategy, indicator: ind };
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
