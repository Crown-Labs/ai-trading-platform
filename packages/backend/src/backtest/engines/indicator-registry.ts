import { StrategyDSL } from '@ai-trading/shared';

// Maps variable names to their indicator group key
export const INDICATOR_VARIABLE_MAP: Record<string, string> = {
  rsi: 'rsi',
  ema_fast: 'ema_fast',
  ema_slow: 'ema_slow',
  sma: 'sma',
  macd: 'macd',
  macd_signal: 'macd',
  macd_histogram: 'macd',
  bb_upper: 'bbands',
  bb_middle: 'bbands',
  bb_lower: 'bbands',
  stoch_k: 'stoch',
  stoch_d: 'stoch',
  adx: 'adx',
  atr: 'atr',
  // New indicators
  cci: 'cci',
  wma: 'wma',
  vwap: 'vwap',
  obv: 'obv',
  roc: 'roc',
  stochrsi: 'stochrsi',
  dema: 'dema',
  tema: 'tema',
  hma: 'hma',
  willr: 'willr',
  mfi: 'mfi',
  kc_lower: 'kc',
  kc_middle: 'kc',
  kc_upper: 'kc',
  aroon_up: 'aroon',
  aroon_down: 'aroon',
  psar: 'psar',
  cmf: 'cmf',
  // Base values
  close: 'close',
  volume: 'volume',
};

export const DEFAULT_INDICATOR_PARAMS: Record<string, any> = {
  rsi: 14,
  ema_fast: 20,
  ema_slow: 200,
  sma: 50,
  adx: 14,
  atr: 14,
  macd: { fast: 12, slow: 26, signal: 9 },
  bbands: { period: 20, stddev: 2 },
  stoch: { kPeriod: 14, dPeriod: 3 },
  // New indicators
  cci: 20,
  wma: 20,
  vwap: 20,
  obv: {},
  roc: 14,
  stochrsi: 14,
  dema: 20,
  tema: 20,
  hma: 20,
  willr: 14,
  mfi: 14,
  kc: { period: 20, multiple: 2 },
  aroon: 25,
  psar: { step: 0.02, max: 0.2 },
  cmf: 20,
};

export function extractConditionVariables(
  conditions: string[],
): Set<string> {
  const vars = new Set<string>();
  const known = Object.keys(INDICATOR_VARIABLE_MAP);
  for (const cond of conditions) {
    for (const v of known) {
      if (new RegExp(`\\b${v}\\b`).test(cond)) {
        vars.add(v);
      }
    }
    const crossMatches = cond.matchAll(
      /cross(?:over|under)\((\w+),\s*(\w+)\)/gi,
    );
    for (const m of crossMatches) {
      vars.add(m[1]);
      vars.add(m[2]);
    }
  }
  return vars;
}

export function autoInjectIndicators(
  strategy: StrategyDSL,
): StrategyDSL['indicator'] {
  const allConditions = [
    ...(strategy.entry?.condition ?? []),
    ...(strategy.entry?.short_condition ?? []),
    ...(strategy.exit?.condition ?? []),
    ...(strategy.exit?.short_condition ?? []),
  ];
  const usedVars = extractConditionVariables(allConditions);
  const ind = { ...(strategy.indicator ?? {}) } as any;

  // Map used variables to their indicator groups
  const neededGroups = new Set<string>();
  for (const v of usedVars) {
    const group = INDICATOR_VARIABLE_MAP[v];
    if (group && group !== 'close' && group !== 'volume') {
      neededGroups.add(group);
    }
  }

  // Inject defaults for missing groups
  for (const group of neededGroups) {
    const defaultVal = DEFAULT_INDICATOR_PARAMS[group];
    if (defaultVal == null) continue;

    if (typeof defaultVal === 'number') {
      // Simple indicator (rsi, ema_fast, etc.)
      if (ind[group] == null) {
        ind[group] = defaultVal;
      }
    } else {
      // Complex indicator (macd, bbands, stoch)
      if (ind[group] == null) {
        ind[group] = { ...defaultVal };
      }
    }
  }

  return ind;
}
