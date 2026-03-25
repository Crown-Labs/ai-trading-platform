import { Injectable } from '@nestjs/common';

@Injectable()
export class RiskEngine {
  checkLongStopLoss(
    currentPrice: number,
    entryPrice: number,
    stopLoss: number,
  ): boolean {
    const pnlPercent =
      ((currentPrice - entryPrice) / entryPrice) * 100;
    return pnlPercent <= -stopLoss;
  }

  checkLongTakeProfit(
    currentPrice: number,
    entryPrice: number,
    takeProfit: number,
  ): boolean {
    const pnlPercent =
      ((currentPrice - entryPrice) / entryPrice) * 100;
    return pnlPercent >= takeProfit;
  }

  checkShortStopLoss(
    currentPrice: number,
    entryPrice: number,
    stopLoss: number,
  ): boolean {
    return currentPrice >= entryPrice * (1 + stopLoss / 100);
  }

  checkShortTakeProfit(
    currentPrice: number,
    entryPrice: number,
    takeProfit: number,
  ): boolean {
    return currentPrice <= entryPrice * (1 - takeProfit / 100);
  }
}
