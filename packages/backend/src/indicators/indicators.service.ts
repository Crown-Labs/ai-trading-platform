import { Injectable } from '@nestjs/common';
import * as indicators from '@ixjb94/indicators-js';

@Injectable()
export class IndicatorsService {
  calculateRSI(closes: number[], period: number): number[] {
    return indicators.rsi(closes, period);
  }

  calculateEMA(closes: number[], period: number): number[] {
    return indicators.ema(closes, period);
  }

  calculateSMA(closes: number[], period: number): number[] {
    return indicators.sma(closes, period);
  }

  calculateMACD(
    closes: number[],
    fast: number,
    slow: number,
    signal: number,
  ): { macd: number[]; signal: number[]; histogram: number[] } {
    const result = indicators.macd(closes, fast, slow, signal);
    return {
      macd: result[0],
      signal: result[1],
      histogram: result[2],
    };
  }

  calculateBBands(
    closes: number[],
    period: number,
    stddev: number,
  ): { lower: number[]; middle: number[]; upper: number[] } {
    const result = indicators.bbands(closes, period, stddev);
    return {
      lower: result[0],
      middle: result[1],
      upper: result[2],
    };
  }

  calculateStoch(
    high: number[],
    low: number[],
    close: number[],
    kPeriod: number,
    dPeriod: number,
  ): { k: number[]; d: number[] } {
    const result = indicators.stoch(high, low, close, kPeriod, 1, dPeriod);
    return {
      k: result[0],
      d: result[1],
    };
  }

  calculateATR(
    high: number[],
    low: number[],
    close: number[],
    period: number,
  ): number[] {
    return indicators.atr(high, low, close, period);
  }

  calculateADX(
    high: number[],
    low: number[],
    period: number,
  ): number[] {
    return indicators.adx(high, low, period);
  }

  isCrossover(
    series1: number[],
    series2: number[],
    index: number,
  ): boolean {
    if (index < 1) return false;
    const prev1 = series1[index - 1],
      curr1 = series1[index];
    const prev2 = series2[index - 1],
      curr2 = series2[index];
    if (prev1 == null || curr1 == null || prev2 == null || curr2 == null)
      return false;
    return prev1 <= prev2 && curr1 > curr2;
  }

  isCrossunder(
    series1: number[],
    series2: number[],
    index: number,
  ): boolean {
    if (index < 1) return false;
    const prev1 = series1[index - 1],
      curr1 = series1[index];
    const prev2 = series2[index - 1],
      curr2 = series2[index];
    if (prev1 == null || curr1 == null || prev2 == null || curr2 == null)
      return false;
    return prev1 >= prev2 && curr1 < curr2;
  }
}
