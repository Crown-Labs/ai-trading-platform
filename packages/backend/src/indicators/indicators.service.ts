import { Injectable } from '@nestjs/common';

@Injectable()
export class IndicatorsService {
  calculateEMA(closes: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for the first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += closes[i];
    }
    ema.push(sum / period);

    for (let i = period; i < closes.length; i++) {
      ema.push((closes[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
    }

    // Pad with NaN at the beginning
    const padding = new Array(period - 1).fill(NaN);
    return [...padding, ...ema];
  }

  calculateRSI(closes: number[], period: number): number[] {
    const rsi: number[] = new Array(period).fill(NaN);
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    // Initial average gain/loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      const currentRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + currentRs));
    }

    return rsi;
  }
}
