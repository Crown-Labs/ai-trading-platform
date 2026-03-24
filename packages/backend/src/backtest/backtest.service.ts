import { Injectable } from '@nestjs/common';
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
  constructor(
    private readonly marketData: MarketDataService,
    private readonly indicators: IndicatorsService,
  ) {}

  async runBacktest(strategy: StrategyDSL): Promise<BacktestResult> {
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

  private evaluateCondition(
    condition: string,
    indicators: Record<string, number[]>,
    index: number,
  ): boolean {
    const match = condition.match(
      /(\w+)\s*(>|<|>=|<=|==)\s*(\w+(?:\.\d+)?)/,
    );
    if (!match) return false;

    const [, left, operator, right] = match;

    const leftVal = indicators[left]?.[index];
    if (leftVal === undefined || isNaN(leftVal)) return false;

    let rightVal: number;
    if (indicators[right]) {
      rightVal = indicators[right][index];
      if (rightVal === undefined || isNaN(rightVal)) return false;
    } else {
      rightVal = parseFloat(right);
      if (isNaN(rightVal)) return false;
    }

    switch (operator) {
      case '>':
        return leftVal > rightVal;
      case '<':
        return leftVal < rightVal;
      case '>=':
        return leftVal >= rightVal;
      case '<=':
        return leftVal <= rightVal;
      case '==':
        return leftVal === rightVal;
      default:
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
            INITIAL_CAPITAL * risk.position_size * leverage;
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
