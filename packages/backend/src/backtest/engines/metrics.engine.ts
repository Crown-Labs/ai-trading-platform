import { Injectable } from '@nestjs/common';
import { Trade, BacktestMetrics } from '@ai-trading/shared';

const DEFAULT_INITIAL_CAPITAL = 1000000;

@Injectable()
export class MetricsEngine {
  calculate(
    trades: Trade[],
    initialCapital = DEFAULT_INITIAL_CAPITAL,
  ): BacktestMetrics {
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
    let equity = initialCapital;
    let peak = initialCapital;
    let maxDrawdown = 0;

    for (const trade of trades) {
      equity += trade.pnl;
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const totalReturn =
      ((equity - initialCapital) / initialCapital) * 100;

    // Profit factor
    const grossProfit = trades
      .filter((t) => t.pnl > 0)
      .reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(
      trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0),
    );
    const profitFactor = grossLoss === 0 ? 0 : grossProfit / grossLoss;

    // Annualized Sharpe ratio
    const returns = trades.map((t) => t.pnl / initialCapital);
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
