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
    const values: IndicatorValues = {};

    if (indicator.rsi) {
      values['rsi'] = this.indicators.calculateRSI(closes, indicator.rsi);
    }
    if (indicator.ema_fast) {
      values['ema_fast'] = this.indicators.calculateEMA(
        closes,
        indicator.ema_fast,
      );
    }
    if (indicator.ema_slow) {
      values['ema_slow'] = this.indicators.calculateEMA(
        closes,
        indicator.ema_slow,
      );
    }
    if (indicator.sma) {
      values['sma'] = this.indicators.calculateSMA(closes, indicator.sma);
    }
    if (indicator.macd) {
      const m = indicator.macd;
      const result = this.indicators.calculateMACD(
        closes,
        m.fast,
        m.slow,
        m.signal,
      );
      values['macd'] = result.macd;
      values['macd_signal'] = result.signal;
      values['macd_histogram'] = result.histogram;
    }
    if (indicator.bbands) {
      const b = indicator.bbands;
      const result = this.indicators.calculateBBands(
        closes,
        b.period,
        b.stddev ?? 2,
      );
      values['bb_upper'] = result.upper;
      values['bb_middle'] = result.middle;
      values['bb_lower'] = result.lower;
    }
    if (indicator.stoch) {
      const s = indicator.stoch;
      const result = this.indicators.calculateStoch(
        highs,
        lows,
        closes,
        s.kPeriod ?? 14,
        s.dPeriod ?? 3,
      );
      values['stoch_k'] = result.k;
      values['stoch_d'] = result.d;
    }
    if (indicator.atr) {
      values['atr'] = this.indicators.calculateATR(
        highs,
        lows,
        closes,
        indicator.atr,
      );
    }
    if (indicator.adx) {
      values['adx'] = this.indicators.calculateADX(
        highs,
        lows,
        indicator.adx,
      );
    }

    values['close'] = closes;
    values['volume'] = candles.map((c) => c.volume);

    return values;
  }
}
