import { Injectable, Logger } from '@nestjs/common';
import { OHLCVCandle, StrategyDSL } from '@ai-trading/shared';
import { IndicatorsService } from '../../indicators/indicators.service';
import { autoInjectIndicators } from './indicator-registry';

export type IndicatorValues = Record<string, number[]>;

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
      if (key === 'macd' && typeof value === 'object') {
        const result = this.indicators.calculate(key, inputs, {
          ...value,
          volume: volumes,
        });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['macd'] = result.macd as number[];
          values['macd_signal'] = result.signal as number[];
          values['macd_histogram'] = result.histogram as number[];
        }
      } else if (key === 'bbands' && typeof value === 'object') {
        const result = this.indicators.calculate(key, inputs, {
          ...value,
          volume: volumes,
        });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['bb_upper'] = result.upper as number[];
          values['bb_middle'] = result.middle as number[];
          values['bb_lower'] = result.lower as number[];
        }
      } else if (key === 'stoch' && typeof value === 'object') {
        const result = this.indicators.calculate(key, inputs, {
          ...value,
          volume: volumes,
        });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['stoch_k'] = result.k as number[];
          values['stoch_d'] = result.d as number[];
        }
      } else if (key === 'kc' && typeof value === 'object') {
        const result = this.indicators.calculate(key, inputs, {
          ...value,
          volume: volumes,
        });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['kc_lower'] = result.lower as number[];
          values['kc_middle'] = result.middle as number[];
          values['kc_upper'] = result.upper as number[];
        }
      } else if (key === 'aroon' && typeof value === 'number') {
        const result = this.indicators.calculate(key, inputs, {
          period: value,
          volume: volumes,
        });
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          values['aroon_up'] = result.up as number[];
          values['aroon_down'] = result.down as number[];
        }
      } else if (key === 'ema_fast' || key === 'ema_slow') {
        // Handle EMA variations
        const result = this.indicators.calculate('ema', inputs, {
          period: value,
          volume: volumes,
        });
        if (result && Array.isArray(result)) {
          values[key] = result;
        }
      } else {
        // Generic handling for simple indicators
        const params =
          typeof value === 'object' ? { ...value, volume: volumes } : { period: value, volume: volumes };
        const result = this.indicators.calculate(key, inputs, params);
        if (result) {
          if (Array.isArray(result)) {
            values[key] = result;
          } else if (typeof result === 'object') {
            // For any other complex indicators, try to flatten
            for (const [subKey, subValue] of Object.entries(result)) {
              if (Array.isArray(subValue)) {
                values[`${key}_${subKey}`] = subValue;
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
