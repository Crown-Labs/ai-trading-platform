import { Injectable, Logger } from '@nestjs/common';
import {
  StrategyDSL,
  BacktestResult,
  Trade,
  BacktestMetrics,
  OHLCVCandle,
} from '@ai-trading/shared';
import { MarketDataService } from '../market-data/market-data.service';
import { IndicatorsService } from '../indicators/indicators.service';

const DEFAULT_COMMISSION = 0.001;
const DEFAULT_SLIPPAGE = 0.0005;
const DEFAULT_LEVERAGE = 1;
const INITIAL_CAPITAL = 10000;

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(
    private readonly marketData: MarketDataService,
    private readonly indicators: IndicatorsService,
  ) {}

  async runBacktest(inputStrategy: StrategyDSL): Promise<BacktestResult> {
    const strategy = this.preprocessDSL(inputStrategy);
    const startTime = strategy.startDate ? new Date(strategy.startDate).getTime() : undefined;
    const endTime = strategy.endDate ? new Date(strategy.endDate).getTime() : undefined;
    const candles = await this.marketData.getCandles(
      strategy.market.symbol,
      strategy.market.timeframe,
      startTime,
      endTime,
      500,
    );

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const indicatorValues: Record<string, number[]> = {};

    if (strategy.indicator.rsi) {
      indicatorValues['rsi'] = this.indicators.calculateRSI(
        closes,
        strategy.indicator.rsi,
      );
    }
    if (strategy.indicator.ema_fast) {
      indicatorValues['ema_fast'] = this.indicators.calculateEMA(
        closes,
        strategy.indicator.ema_fast,
      );
    }
    if (strategy.indicator.ema_slow) {
      indicatorValues['ema_slow'] = this.indicators.calculateEMA(
        closes,
        strategy.indicator.ema_slow,
      );
    }
    if (strategy.indicator.sma) {
      indicatorValues['sma'] = this.indicators.calculateSMA(
        closes,
        strategy.indicator.sma,
      );
    }
    if (strategy.indicator.macd) {
      const m = strategy.indicator.macd;
      const result = this.indicators.calculateMACD(closes, m.fast, m.slow, m.signal);
      indicatorValues['macd'] = result.macd;
      indicatorValues['macd_signal'] = result.signal;
      indicatorValues['macd_histogram'] = result.histogram;
    }
    if (strategy.indicator.bbands) {
      const b = strategy.indicator.bbands;
      const result = this.indicators.calculateBBands(closes, b.period, b.stddev ?? 2);
      indicatorValues['bb_upper'] = result.upper;
      indicatorValues['bb_middle'] = result.middle;
      indicatorValues['bb_lower'] = result.lower;
    }
    if (strategy.indicator.stoch) {
      const s = strategy.indicator.stoch;
      const result = this.indicators.calculateStoch(highs, lows, closes, s.kPeriod ?? 14, s.dPeriod ?? 3);
      indicatorValues['stoch_k'] = result.k;
      indicatorValues['stoch_d'] = result.d;
    }
    if (strategy.indicator.atr) {
      indicatorValues['atr'] = this.indicators.calculateATR(highs, lows, closes, strategy.indicator.atr);
    }
    if (strategy.indicator.adx) {
      indicatorValues['adx'] = this.indicators.calculateADX(highs, lows, strategy.indicator.adx);
    }
    indicatorValues['close'] = closes;
    indicatorValues['volume'] = candles.map((c) => c.volume);

    const commission = strategy.execution?.commission ?? DEFAULT_COMMISSION;
    const slippage = strategy.execution?.slippage ?? DEFAULT_SLIPPAGE;
    const leverage = strategy.execution?.leverage ?? DEFAULT_LEVERAGE;

    const trades = this.simulateTrades(
      candles,
      indicatorValues,
      strategy.entry.condition,
      strategy.exit.condition,
      strategy.risk,
      commission,
      slippage,
      leverage,
    );

    const metrics = this.calculateMetrics(trades);

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
      const crossMatches = cond.match(/cross(?:over|under)\((\w+),\s*(\w+)\)/gi);
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
      ...(strategy.exit?.condition ?? []),
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
        this.logger.log(`Auto-injecting missing indicator: ${key}=${defaultPeriod}`);
        (ind as any)[key] = defaultPeriod;
      }
    }

    if (
      (usedVars.has('macd') || usedVars.has('macd_signal') || usedVars.has('macd_histogram')) &&
      !ind.macd
    ) {
      this.logger.log('Auto-injecting missing indicator: macd={fast:12,slow:26,signal:9}');
      ind.macd = { fast: 12, slow: 26, signal: 9 };
    }

    if (
      (usedVars.has('bb_upper') || usedVars.has('bb_middle') || usedVars.has('bb_lower')) &&
      !ind.bbands
    ) {
      this.logger.log('Auto-injecting missing indicator: bbands={period:20,stddev:2}');
      ind.bbands = { period: 20, stddev: 2 };
    }

    if ((usedVars.has('stoch_k') || usedVars.has('stoch_d')) && !ind.stoch) {
      this.logger.log('Auto-injecting missing indicator: stoch={kPeriod:14,dPeriod:3}');
      ind.stoch = { kPeriod: 14, dPeriod: 3 };
    }

    return { ...strategy, indicator: ind };
  }

  private evaluateCondition(
    condition: string,
    indicators: Record<string, number[]>,
    index: number,
  ): boolean {
    try {
      // Handle crossover(a, b) and crossunder(a, b) patterns
      const crossMatch = condition.match(
        /cross(over|under)\((\w+),\s*(\w+)\)/i,
      );
      if (crossMatch) {
        const type = crossMatch[1].toLowerCase();
        const a = indicators[crossMatch[2]];
        const b = indicators[crossMatch[3]];
        if (!a || !b) return false;
        if (type === 'over')
          return this.indicators.isCrossover(a, b, index);
        if (type === 'under')
          return this.indicators.isCrossunder(a, b, index);
      }

      // Build vars object with all indicator values at this index
      const vars: Record<string, number> = {};
      for (const [key, values] of Object.entries(indicators)) {
        const val = values[index];
        if (val === undefined || isNaN(val)) return false;
        vars[key] = val;
      }

      // Replace variable names with actual values
      let expr = condition
        .replace(/\band\b/gi, '&&')
        .replace(/\bor\b/gi, '||');

      // Replace known variables (longest first to avoid partial matches)
      const varNames = Object.keys(vars).sort(
        (a, b) => b.length - a.length,
      );
      for (const name of varNames) {
        expr = expr.replace(
          new RegExp(`\\b${name}\\b`, 'g'),
          String(vars[name]),
        );
      }

      // Safe eval using Function
      return new Function(`"use strict"; return (${expr});`)() as boolean;
    } catch {
      return false;
    }
  }

  private simulateTrades(
    candles: OHLCVCandle[],
    indicators: Record<string, number[]>,
    entryConditions: string[],
    exitConditions: string[],
    risk: { stop_loss: number; take_profit: number; position_size: number },
    commission: number,
    slippage: number,
    leverage: number,
  ): Trade[] {
    const trades: Trade[] = [];
    let inPosition = false;
    let entryPrice = 0;
    let entryTime = '';
    let tradeId = 0;

    for (let i = 1; i < candles.length; i++) {
      if (!inPosition) {
        const entrySignal = entryConditions.every((cond) =>
          this.evaluateCondition(cond, indicators, i),
        );

        if (entrySignal) {
          inPosition = true;
          entryPrice = candles[i].close;
          entryTime = new Date(candles[i].timestamp).toISOString();
        }
      } else {
        const currentPrice = candles[i].close;
        const rawPnlPercent =
          ((currentPrice - entryPrice) / entryPrice) * 100;

        const exitSignal =
          exitConditions.every((cond) =>
            this.evaluateCondition(cond, indicators, i),
          ) ||
          rawPnlPercent <= -risk.stop_loss ||
          rawPnlPercent >= risk.take_profit;

        if (exitSignal) {
          const effectiveEntry = entryPrice * (1 + slippage);
          const effectiveExit = currentPrice * (1 - slippage);
          const positionValue =
            INITIAL_CAPITAL * (risk.position_size / 100) * leverage;
          const fee = positionValue * commission * 2;
          const rawPnl =
            ((effectiveExit - effectiveEntry) / effectiveEntry) *
            positionValue;
          const netPnl = rawPnl - fee;
          const netPnlPercent = (netPnl / INITIAL_CAPITAL) * 100;

          const sign = netPnlPercent >= 0 ? '+' : '\u2212';
          const formatted = `${sign}${Math.abs(netPnlPercent).toFixed(2)}%`;

          tradeId++;
          trades.push({
            id: tradeId,
            entryTime,
            exitTime: new Date(candles[i].timestamp).toISOString(),
            entryPrice,
            exitPrice: currentPrice,
            side: 'long',
            pnl: parseFloat(netPnl.toFixed(2)),
            pnlPercent: formatted,
            fees: parseFloat(fee.toFixed(2)),
            isWin: netPnl > 0,
          });
          inPosition = false;
        }
      }
    }

    return trades;
  }

  private calculateMetrics(trades: Trade[]): BacktestMetrics {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        profitFactor: 0,
        totalFees: 0,
      };
    }

    const wins = trades.filter((t) => t.isWin).length;
    const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);

    // Equity curve for drawdown and total return
    let equity = INITIAL_CAPITAL;
    let peak = INITIAL_CAPITAL;
    let maxDrawdown = 0;

    for (const trade of trades) {
      equity += trade.pnl;
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const totalReturn =
      ((equity - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;

    // Profit factor
    const grossProfit = trades
      .filter((t) => t.pnl > 0)
      .reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(
      trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0),
    );
    const profitFactor = grossLoss === 0 ? 0 : grossProfit / grossLoss;

    // Annualized Sharpe ratio
    const returns = trades.map((t) => t.pnl / INITIAL_CAPITAL);
    const meanReturn =
      returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio =
      stdDev === 0 ? 0 : (meanReturn / stdDev) * Math.sqrt(252);

    return {
      totalTrades: trades.length,
      winRate: parseFloat(((wins / trades.length) * 100).toFixed(2)),
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
    };
  }
}
