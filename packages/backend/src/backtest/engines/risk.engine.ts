import { Injectable } from '@nestjs/common';
import { OHLCVCandle } from '@ai-trading/shared';

export interface RiskCheckResult {
  triggered: boolean;
  fillPrice: number;
}

@Injectable()
export class RiskEngine {
  /**
   * Long SL: triggered if candle low dips to/below stop price.
   * Fill at the stop price (not the low).
   */
  checkLongStopLoss(
    candle: OHLCVCandle,
    entryPrice: number,
    stopLoss: number,
  ): RiskCheckResult {
    const stopPrice = entryPrice * (1 - stopLoss / 100);
    if (candle.low <= stopPrice) {
      return { triggered: true, fillPrice: stopPrice };
    }
    return { triggered: false, fillPrice: 0 };
  }

  /**
   * Long TP: triggered if candle high reaches/exceeds take profit price.
   * Fill at the TP price.
   */
  checkLongTakeProfit(
    candle: OHLCVCandle,
    entryPrice: number,
    takeProfit: number,
  ): RiskCheckResult {
    const tpPrice = entryPrice * (1 + takeProfit / 100);
    if (candle.high >= tpPrice) {
      return { triggered: true, fillPrice: tpPrice };
    }
    return { triggered: false, fillPrice: 0 };
  }

  /**
   * Short SL: triggered if candle high reaches/exceeds stop price (price went up).
   * Fill at the stop price.
   */
  checkShortStopLoss(
    candle: OHLCVCandle,
    entryPrice: number,
    stopLoss: number,
  ): RiskCheckResult {
    const stopPrice = entryPrice * (1 + stopLoss / 100);
    if (candle.high >= stopPrice) {
      return { triggered: true, fillPrice: stopPrice };
    }
    return { triggered: false, fillPrice: 0 };
  }

  /**
   * Short TP: triggered if candle low dips to/below take profit price (price went down).
   * Fill at the TP price.
   */
  checkShortTakeProfit(
    candle: OHLCVCandle,
    entryPrice: number,
    takeProfit: number,
  ): RiskCheckResult {
    const tpPrice = entryPrice * (1 - takeProfit / 100);
    if (candle.low <= tpPrice) {
      return { triggered: true, fillPrice: tpPrice };
    }
    return { triggered: false, fillPrice: 0 };
  }
}
