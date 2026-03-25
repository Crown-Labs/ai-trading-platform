import { Injectable, Logger } from '@nestjs/common';
import * as indicators from '@ixjb94/indicators-js';

export type IndicatorInput = {
  closes?: number[];
  highs?: number[];
  lows?: number[];
};

export type IndicatorResult = number[] | Record<string, number[]>;

interface IndicatorConfig {
  inputs: ('closes' | 'highs' | 'lows')[];
  params: string[];
  calculate: (inputs: IndicatorInput, params: any) => IndicatorResult;
}

@Injectable()
export class IndicatorsService {
  private readonly logger = new Logger(IndicatorsService.name);

  // Dynamic indicator registry
  private readonly registry: Record<string, IndicatorConfig> = {
    rsi: {
      inputs: ['closes'],
      params: ['period'],
      calculate: (inputs, params) => indicators.rsi(inputs.closes!, params.period),
    },
    ema: {
      inputs: ['closes'],
      params: ['period'],
      calculate: (inputs, params) => indicators.ema(inputs.closes!, params.period),
    },
    sma: {
      inputs: ['closes'],
      params: ['period'],
      calculate: (inputs, params) => indicators.sma(inputs.closes!, params.period),
    },
    macd: {
      inputs: ['closes'],
      params: ['fast', 'slow', 'signal'],
      calculate: (inputs, params) => {
        const result = indicators.macd(inputs.closes!, params.fast, params.slow, params.signal);
        return {
          macd: result[0],
          signal: result[1],
          histogram: result[2],
        };
      },
    },
    bbands: {
      inputs: ['closes'],
      params: ['period', 'stddev'],
      calculate: (inputs, params) => {
        const result = indicators.bbands(inputs.closes!, params.period, params.stddev);
        return {
          lower: result[0],
          middle: result[1],
          upper: result[2],
        };
      },
    },
    stoch: {
      inputs: ['highs', 'lows', 'closes'],
      params: ['kPeriod', 'dPeriod'],
      calculate: (inputs, params) => {
        const result = indicators.stoch(
          inputs.highs!,
          inputs.lows!,
          inputs.closes!,
          params.kPeriod,
          1,
          params.dPeriod,
        );
        return {
          k: result[0],
          d: result[1],
        };
      },
    },
    atr: {
      inputs: ['highs', 'lows', 'closes'],
      params: ['period'],
      calculate: (inputs, params) =>
        indicators.atr(inputs.highs!, inputs.lows!, inputs.closes!, params.period),
    },
    adx: {
      inputs: ['highs', 'lows'],
      params: ['period'],
      calculate: (inputs, params) =>
        indicators.adx(inputs.highs!, inputs.lows!, params.period),
    },
    // Additional popular indicators
    cci: {
      inputs: ['highs', 'lows', 'closes'],
      params: ['period'],
      calculate: (inputs, params) =>
        indicators.cci(inputs.highs!, inputs.lows!, inputs.closes!, params.period),
    },
    wma: {
      inputs: ['closes'],
      params: ['period'],
      calculate: (inputs, params) => indicators.wma(inputs.closes!, params.period),
    },
    vwap: {
      inputs: ['highs', 'lows', 'closes'],
      params: ['period'],
      calculate: (inputs, params) =>
        indicators.vwap(
          inputs.highs!,
          inputs.lows!,
          inputs.closes!,
          params.volume || [],
          params.period,
        ),
    },
    obv: {
      inputs: ['closes'],
      params: [],
      calculate: (inputs, params) => {
        // OBV needs volume array, but we'll handle that in indicator.engine.ts
        return indicators.obv(inputs.closes!, params.volume || []);
      },
    },
    roc: {
      inputs: ['closes'],
      params: ['period'],
      calculate: (inputs, params) => indicators.roc(inputs.closes!, params.period),
    },
    stochrsi: {
      inputs: ['closes'],
      params: ['period'],
      calculate: (inputs, params) => indicators.stochrsi(inputs.closes!, params.period),
    },
    dema: {
      inputs: ['closes'],
      params: ['period'],
      calculate: (inputs, params) => indicators.dema(inputs.closes!, params.period),
    },
    tema: {
      inputs: ['closes'],
      params: ['period'],
      calculate: (inputs, params) => indicators.tema(inputs.closes!, params.period),
    },
    hma: {
      inputs: ['closes'],
      params: ['period'],
      calculate: (inputs, params) => indicators.hma(inputs.closes!, params.period),
    },
    willr: {
      inputs: ['highs', 'lows', 'closes'],
      params: ['period'],
      calculate: (inputs, params) =>
        indicators.willr(inputs.highs!, inputs.lows!, inputs.closes!, params.period),
    },
    mfi: {
      inputs: ['highs', 'lows', 'closes'],
      params: ['period'],
      calculate: (inputs, params) => {
        // MFI needs volume array
        return indicators.mfi(
          inputs.highs!,
          inputs.lows!,
          inputs.closes!,
          params.volume || [],
          params.period,
        );
      },
    },
    kc: {
      inputs: ['highs', 'lows', 'closes'],
      params: ['period', 'multiple'],
      calculate: (inputs, params) => {
        const result = indicators.kc(
          inputs.highs!,
          inputs.lows!,
          inputs.closes!,
          params.period,
          params.multiple,
        );
        return {
          lower: result[0],
          middle: result[1],
          upper: result[2],
        };
      },
    },
    aroon: {
      inputs: ['highs', 'lows'],
      params: ['period'],
      calculate: (inputs, params) => {
        const result = indicators.aroon(inputs.highs!, inputs.lows!, params.period);
        return {
          down: result[0],
          up: result[1],
        };
      },
    },
    psar: {
      inputs: ['highs', 'lows'],
      params: ['step', 'max'],
      calculate: (inputs, params) =>
        indicators.psar(inputs.highs!, inputs.lows!, params.step, params.max),
    },
    cmf: {
      inputs: ['highs', 'lows', 'closes'],
      params: ['period'],
      calculate: (inputs, params) => {
        // CMF needs volume array
        return indicators.cmf(
          inputs.highs!,
          inputs.lows!,
          inputs.closes!,
          params.volume || [],
          params.period,
        );
      },
    },
  };

  /**
   * Dynamically calculate any registered indicator
   */
  calculate(
    name: string,
    inputs: IndicatorInput,
    params: Record<string, any>,
  ): IndicatorResult | null {
    const config = this.registry[name.toLowerCase()];
    if (!config) {
      this.logger.warn(`Unknown indicator: ${name}`);
      return null;
    }

    try {
      return config.calculate(inputs, params);
    } catch (err) {
      this.logger.error(`Failed to calculate ${name}: ${err}`);
      return null;
    }
  }

  /**
   * Check if an indicator is registered
   */
  hasIndicator(name: string): boolean {
    return name.toLowerCase() in this.registry;
  }

  /**
   * Get all registered indicator names
   */
  getRegisteredIndicators(): string[] {
    return Object.keys(this.registry);
  }

  // ===== Backward compatible methods (optional - can keep or remove) =====

  calculateRSI(closes: number[], period: number): number[] {
    return this.calculate('rsi', { closes }, { period }) as number[];
  }

  calculateEMA(closes: number[], period: number): number[] {
    return this.calculate('ema', { closes }, { period }) as number[];
  }

  calculateSMA(closes: number[], period: number): number[] {
    return this.calculate('sma', { closes }, { period }) as number[];
  }

  calculateMACD(
    closes: number[],
    fast: number,
    slow: number,
    signal: number,
  ): { macd: number[]; signal: number[]; histogram: number[] } {
    return this.calculate('macd', { closes }, { fast, slow, signal }) as {
      macd: number[];
      signal: number[];
      histogram: number[];
    };
  }

  calculateBBands(
    closes: number[],
    period: number,
    stddev: number,
  ): { lower: number[]; middle: number[]; upper: number[] } {
    return this.calculate('bbands', { closes }, { period, stddev }) as {
      lower: number[];
      middle: number[];
      upper: number[];
    };
  }

  calculateStoch(
    high: number[],
    low: number[],
    close: number[],
    kPeriod: number,
    dPeriod: number,
  ): { k: number[]; d: number[] } {
    return this.calculate(
      'stoch',
      { highs: high, lows: low, closes: close },
      { kPeriod, dPeriod },
    ) as { k: number[]; d: number[] };
  }

  calculateATR(
    high: number[],
    low: number[],
    close: number[],
    period: number,
  ): number[] {
    return this.calculate(
      'atr',
      { highs: high, lows: low, closes: close },
      { period },
    ) as number[];
  }

  calculateADX(
    high: number[],
    low: number[],
    period: number,
  ): number[] {
    return this.calculate(
      'adx',
      { highs: high, lows: low },
      { period },
    ) as number[];
  }

  // ===== Utility methods =====

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
