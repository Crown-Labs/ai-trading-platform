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

@Injectable()
export class BacktestService {
  constructor(
    private readonly marketData: MarketDataService,
    private readonly indicators: IndicatorsService,
  ) {}

  async runBacktest(strategy: StrategyDSL): Promise<BacktestResult> {
    const candles = await this.marketData.getCandles(
      strategy.market.symbol,
      strategy.market.timeframe,
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

    const trades = this.simulateTrades(
      candles,
      indicatorValues,
      strategy.entry.condition,
      strategy.exit.condition,
      strategy.risk,
    );

    const metrics = this.calculateMetrics(trades);

    return { strategy, trades, metrics };
  }

  private evaluateCondition(
    condition: string,
    indicators: Record<string, number[]>,
    index: number,
  ): boolean {
    // Parse conditions like 'rsi < 30', 'rsi > 70', 'ema_fast > ema_slow'
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
        const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

        const exitSignal =
          exitConditions.every((cond) =>
            this.evaluateCondition(cond, indicators, i),
          ) ||
          pnlPercent <= -risk.stop_loss ||
          pnlPercent >= risk.take_profit;

        if (exitSignal) {
          const profit = (currentPrice - entryPrice) * risk.position_size;
          tradeId++;
          trades.push({
            id: tradeId,
            entryTime,
            exitTime: new Date(candles[i].timestamp).toISOString(),
            entryPrice,
            exitPrice: currentPrice,
            side: 'long',
            profit: parseFloat(profit.toFixed(2)),
            profitPercent: parseFloat(pnlPercent.toFixed(2)),
            isWin: profit > 0,
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
      };
    }

    const wins = trades.filter((t) => t.isWin).length;
    const totalReturn = trades.reduce((sum, t) => sum + t.profitPercent, 0);

    // Max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    for (const trade of trades) {
      cumulative += trade.profitPercent;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Sharpe ratio (simplified)
    const returns = trades.map((t) => t.profitPercent);
    const avgReturn = totalReturn / trades.length;
    const variance =
      returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) /
      trades.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev === 0 ? 0 : avgReturn / stdDev;

    return {
      totalTrades: trades.length,
      winRate: parseFloat(((wins / trades.length) * 100).toFixed(2)),
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    };
  }
}
