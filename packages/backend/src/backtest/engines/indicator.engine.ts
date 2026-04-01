import { Injectable, Logger } from '@nestjs/common';
import { OHLCVCandle, StrategyDSL } from '@ai-trading/shared';
import { IndicatorsService } from '../../indicators/indicators.service';
import { autoInjectIndicators } from './indicator-registry';

export type IndicatorValues = Record<string, number[]>;

/**
 * Returns the warm-up period (number of leading NaN bars) for a given indicator config.
 * Matches TradingView behavior: first `period-1` bars are NaN.
 */
function getWarmupPeriod(key: string, value: any): number {
  if (typeof value === 'number') return value - 1;
  if (typeof value === 'object' && value !== null) {
    // Use the longest period for complex indicators
    const periods: number[] = [];
    if (value.period != null) periods.push(value.period);
    if (value.fast != null) periods.push(value.fast);
    if (value.slow != null) periods.push(value.slow);
    if (value.kPeriod != null) periods.push(value.kPeriod);
    if (value.dPeriod != null) periods.push(value.dPeriod);
    if (periods.length > 0) return Math.max(...periods) - 1;
  }
  return 0;
}

/**
 * Set the first `warmup` values of an array to NaN.
 * Matches TradingView: indicators return NaN during warm-up period.
 */
function applyWarmup(arr: number[], warmup: number): number[] {
  if (warmup <= 0) return arr;
  return arr.map((v, i) => (i < warmup ? NaN : v));
}

@Injectable()
export class IndicatorEngine {
  private readonly logger = new Logger(IndicatorEngine.name);

  constructor(private readonly indicators: IndicatorsService) {}

  /**
   * Auto-detect indicators from conditions, inject defaults, then compute all.
   */
  autoCompute(
    candles: OHLCVCandle[],
    strategy: StrategyDSL,
  ): { values: IndicatorValues; indicator: StrategyDSL['indicator'] } {
    const indicator = autoInjectIndicators(strategy);

    // Log auto-injected indicators
    const original = strategy.indicator ?? {};
    for (const key of Object.keys(indicator)) {
      if ((original as any)[key] == null && (indicator as any)[key] != null) {
        this.logger.log(
          `Auto-injected indicator: ${key}=${JSON.stringify((indicator as any)[key])}`,
        );
      }
    }

    return { values: this.compute(candles, indicator), indicator };
  }

  compute(
    candles: OHLCVCandle[],
    indicator: StrategyDSL['indicator'],
  ): IndicatorValues {
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);
    const values: IndicatorValues = {};

    const inputs = { closes, highs, lows };

    // Dynamic indicator computation
    for (const [key, value] of Object.entries(indicator)) {
      if (value == null) continue;

      // Handle special cases with specific output mapping
      const warmup = getWarmupPeriod(key, value);

      if (key === 'macd' && typeof value === 'object') {
        const result = this.indicators.calculate(key, inputs, { ...value, volume: volumes });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['macd'] = applyWarmup(result.macd as number[], warmup);
          values['macd_signal'] = applyWarmup(result.signal as number[], warmup);
          values['macd_histogram'] = applyWarmup(result.histogram as number[], warmup);
        }
      } else if (key === 'bbands' && typeof value === 'object') {
        const result = this.indicators.calculate(key, inputs, { ...value, volume: volumes });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['bb_upper'] = applyWarmup(result.upper as number[], warmup);
          values['bb_middle'] = applyWarmup(result.middle as number[], warmup);
          values['bb_lower'] = applyWarmup(result.lower as number[], warmup);
        }
      } else if (key === 'stoch' && typeof value === 'object') {
        const result = this.indicators.calculate(key, inputs, { ...value, volume: volumes });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['stoch_k'] = applyWarmup(result.k as number[], warmup);
          values['stoch_d'] = applyWarmup(result.d as number[], warmup);
        }
      } else if (key === 'kc' && typeof value === 'object') {
        const result = this.indicators.calculate(key, inputs, { ...value, volume: volumes });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['kc_lower'] = applyWarmup(result.lower as number[], warmup);
          values['kc_middle'] = applyWarmup(result.middle as number[], warmup);
          values['kc_upper'] = applyWarmup(result.upper as number[], warmup);
        }
      } else if (key === 'aroon' && typeof value === 'number') {
        const result = this.indicators.calculate(key, inputs, { period: value, volume: volumes });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['aroon_up'] = applyWarmup(result.up as number[], warmup);
          values['aroon_down'] = applyWarmup(result.down as number[], warmup);
        }
      } else if (key === 'ema_fast' || key === 'ema_slow') {
        const result = this.indicators.calculate('ema', inputs, { period: value, volume: volumes });
        if (result && Array.isArray(result)) {
          values[key] = applyWarmup(result, warmup);
        }
      } else {
        const params = typeof value === 'object'
          ? { ...value, volume: volumes }
          : { period: value, volume: volumes };
        const result = this.indicators.calculate(key, inputs, params);
        if (result) {
          if (Array.isArray(result)) {
            values[key] = applyWarmup(result, warmup);
          } else if (typeof result === 'object') {
            for (const [subKey, subValue] of Object.entries(result)) {
              if (Array.isArray(subValue)) {
                values[`${key}_${subKey}`] = applyWarmup(subValue as number[], warmup);
              }
            }
          }
        }
      }
    }

    // Always include base values
    values['close'] = closes;
    values['volume'] = volumes;

    return values;
  }
}
