import { StrategyDSL } from '@ai-trading/shared';

/**
 * Converts DSL condition string to Pine Script expression
 */
function convertCondition(condition: string): string {
  return condition
    .replace(/\bcrossover\((\w+),\s*(\w+)\)/g, 'ta.crossover($1_val, $2_val)')
    .replace(/\bcrossunder\((\w+),\s*(\w+)\)/g, 'ta.crossunder($1_val, $2_val)')
    .replace(/\brsi\b/g, 'rsi_val')
    .replace(/\bema_fast\b/g, 'ema_fast_val')
    .replace(/\bema_slow\b/g, 'ema_slow_val')
    .replace(/\bsma\b/g, 'sma_val')
    .replace(/\bwma\b/g, 'wma_val')
    .replace(/\bdema\b/g, 'dema_val')
    .replace(/\btema\b/g, 'tema_val')
    .replace(/\bhma\b/g, 'hma_val')
    .replace(/\bmacd\b/g, 'macd_line')
    .replace(/\bmacd_signal\b/g, 'macd_signal_val')
    .replace(/\bmacd_hist(ogram)?\b/g, 'macd_hist_val')
    .replace(/\bbb_upper\b/g, 'bb_upper')
    .replace(/\bbb_lower\b/g, 'bb_lower')
    .replace(/\bbb_middle\b/g, 'bb_middle')
    .replace(/\badx\b/g, 'adx_val')
    .replace(/\batr\b/g, 'atr_val')
    .replace(/\bcci\b/g, 'cci_val')
    .replace(/\broc\b/g, 'roc_val')
    .replace(/\bstochrsi\b/g, 'stochrsi_val')
    .replace(/\bwillr\b/g, 'willr_val')
    .replace(/\bmfi\b/g, 'mfi_val')
    .replace(/\bcmf\b/g, 'cmf_val')
    .replace(/\bvwap\b/g, 'vwap_val')
    .replace(/\bobv\b/g, 'obv_val')
    .replace(/\bpsar\b/g, 'psar_val')
    .replace(/\baroon_up\b/g, 'aroon_up_val')
    .replace(/\baroon_down\b/g, 'aroon_down_val')
    .replace(/\bkc_upper\b/g, 'kc_upper_val')
    .replace(/\bkc_lower\b/g, 'kc_lower_val')
    .replace(/\bkc_middle\b/g, 'kc_middle_val')
    .replace(/\bstoch_k\b/g, 'stoch_k_val')
    .replace(/\bstoch_d\b/g, 'stoch_d_val')
    .replace(/\bclose\b/g, 'close')
    .replace(/\bopen\b/g, 'open')
    .replace(/\bhigh\b/g, 'high')
    .replace(/\blow\b/g, 'low')
    .replace(/\bvolume\b/g, 'volume')
    .replace(/\band\b/g, 'and')
    .replace(/\bor\b/g, 'or');
}

export function generatePineScript(strategy: StrategyDSL): string {
  const ind = strategy.indicator ?? {};
  const risk = strategy.risk;
  const exec = strategy.execution;
  const leverage = exec?.leverage ?? 1;
  const commission = exec?.commission != null ? exec.commission * 100 : 0.1;
  const initialCapital = (strategy as any).initialCapital ?? 1000000;

  const lines: string[] = [];

  // Header
  lines.push(`//@version=5`);
  lines.push(`strategy("${strategy.name}", overlay=true, initial_capital=${initialCapital}, default_qty_type=strategy.percent_of_equity, default_qty_value=${risk.position_size}, commission_type=strategy.commission.percent, commission_value=${commission.toFixed(3)})`);
  lines.push(``);

  // Market info comment
  lines.push(`// Market: ${strategy.market.exchange.toUpperCase()} ${strategy.market.symbol} ${strategy.market.timeframe}`);
  if (strategy.startDate || strategy.endDate) {
    lines.push(`// Backtest period: ${strategy.startDate ?? ''} → ${strategy.endDate ?? ''}`);
  }
  lines.push(``);

  // Indicators
  lines.push(`// ─── Indicators ───────────────────────────────────────────`);

  // Trend — Moving Averages
  if (ind.ema_fast != null) {
    lines.push(`ema_fast_val = ta.ema(close, ${ind.ema_fast})`);
  }
  if (ind.ema_slow != null) {
    lines.push(`ema_slow_val = ta.ema(close, ${ind.ema_slow})`);
  }
  if (ind.sma != null) {
    lines.push(`sma_val = ta.sma(close, ${ind.sma})`);
  }
  if (ind.wma != null) {
    lines.push(`wma_val = ta.wma(close, ${ind.wma})`);
  }
  if (ind.dema != null) {
    lines.push(`dema_val = 2 * ta.ema(close, ${ind.dema}) - ta.ema(ta.ema(close, ${ind.dema}), ${ind.dema})`);
  }
  if (ind.tema != null) {
    lines.push(`_ema1_tema = ta.ema(close, ${ind.tema})`);
    lines.push(`_ema2_tema = ta.ema(_ema1_tema, ${ind.tema})`);
    lines.push(`_ema3_tema = ta.ema(_ema2_tema, ${ind.tema})`);
    lines.push(`tema_val = 3 * _ema1_tema - 3 * _ema2_tema + _ema3_tema`);
  }
  if (ind.hma != null) {
    lines.push(`hma_val = ta.wma(2 * ta.wma(close, ${ind.hma} / 2) - ta.wma(close, ${ind.hma}), math.round(math.sqrt(${ind.hma})))`);
  }

  // Momentum
  if (ind.rsi != null) {
    lines.push(`rsi_val = ta.rsi(close, ${ind.rsi})`);
  }
  if (ind.cci != null) {
    lines.push(`cci_val = ta.cci(high, low, close, ${ind.cci})`);
  }
  if (ind.roc != null) {
    lines.push(`roc_val = ta.roc(close, ${ind.roc})`);
  }
  if (ind.stochrsi != null) {
    lines.push(`[stochrsi_val, _stochrsi_d] = ta.stoch(ta.rsi(close, ${ind.stochrsi}), ta.rsi(close, ${ind.stochrsi}), ta.rsi(close, ${ind.stochrsi}), 3)`);
  }
  if (ind.willr != null) {
    lines.push(`willr_val = ta.wpr(${ind.willr})`);
  }
  if (ind.stoch != null) {
    const st = ind.stoch as { kPeriod: number; dPeriod: number };
    lines.push(`stoch_k_val = ta.stoch(close, high, low, ${st.kPeriod})`);
    lines.push(`stoch_d_val = ta.sma(stoch_k_val, ${st.dPeriod})`);
  }
  if (ind.macd != null) {
    const m = ind.macd as { fast: number; slow: number; signal: number };
    lines.push(`[macd_line, macd_signal_val, macd_hist_val] = ta.macd(close, ${m.fast}, ${m.slow}, ${m.signal})`);
  }

  // Volatility
  if (ind.atr != null) {
    lines.push(`atr_val = ta.atr(${ind.atr})`);
  }
  if (ind.bbands != null) {
    const bb = ind.bbands as { period: number; stddev: number };
    lines.push(`[bb_middle, bb_upper, bb_lower] = ta.bb(close, ${bb.period}, ${bb.stddev})`);
  }
  if (ind.kc != null) {
    const kc = ind.kc as { period: number; multiple: number };
    lines.push(`kc_middle_val = ta.ema(close, ${kc.period})`);
    lines.push(`kc_upper_val = kc_middle_val + ${kc.multiple} * ta.atr(${kc.period})`);
    lines.push(`kc_lower_val = kc_middle_val - ${kc.multiple} * ta.atr(${kc.period})`);
  }

  // Trend
  if (ind.adx != null) {
    lines.push(`[adx_val, di_plus, di_minus] = ta.dmi(${ind.adx}, ${ind.adx})`);
  }
  if (ind.aroon != null) {
    lines.push(`aroon_up_val = 100 * (ta.highestbars(high, ${ind.aroon} + 1) + ${ind.aroon}) / ${ind.aroon}`);
    lines.push(`aroon_down_val = 100 * (ta.lowestbars(low, ${ind.aroon} + 1) + ${ind.aroon}) / ${ind.aroon}`);
  }
  if (ind.psar != null) {
    const ps = ind.psar as { step: number; max: number };
    lines.push(`psar_val = ta.sar(${ps.step}, ${ps.max})`);
  }

  // Volume
  if (ind.vwap != null) {
    lines.push(`vwap_val = ta.vwap(close)`);
  }
  if (ind.obv != null) {
    lines.push(`obv_val = ta.obv`);
  }
  if (ind.mfi != null) {
    lines.push(`mfi_val = ta.mfi(high, low, close, volume, ${ind.mfi})`);
  }
  if (ind.cmf != null) {
    lines.push(`_mf_mult = ((close - low) - (high - close)) / (high - low)`);
    lines.push(`_mf_vol = _mf_mult * volume`);
    lines.push(`cmf_val = ta.sma(_mf_vol, ${ind.cmf}) / ta.sma(volume, ${ind.cmf})`);
  }

  lines.push(``);

  // Entry conditions
  lines.push(`// ─── Entry Conditions ─────────────────────────────────────`);
  const longConds = strategy.entry.condition.map(convertCondition);
  lines.push(`longCondition = ${longConds.length > 0 ? longConds.join(' and ') : 'false'}`);

  const shortConds = (strategy.entry.short_condition ?? []).map(convertCondition);
  lines.push(`shortCondition = ${shortConds.length > 0 ? shortConds.join(' and ') : 'false'}`);
  lines.push(``);

  // Exit conditions
  lines.push(`// ─── Exit Conditions ──────────────────────────────────────`);
  const longExitConds = strategy.exit.condition.map(convertCondition);
  lines.push(`longExitCondition = ${longExitConds.length > 0 ? longExitConds.join(' and ') : 'false'}`);

  const shortExitConds = (strategy.exit.short_condition ?? []).map(convertCondition);
  lines.push(`shortExitCondition = ${shortExitConds.length > 0 ? shortExitConds.join(' and ') : 'false'}`);
  lines.push(``);

  // Risk Management
  lines.push(`// ─── Risk Management ──────────────────────────────────────`);
  lines.push(`slPct = ${risk.stop_loss} / 100`);
  lines.push(`tpPct = ${risk.take_profit} / 100`);
  if (leverage > 1) {
    lines.push(`// Leverage: ${leverage}x (manage externally or via qty multiplier)`);
  }
  lines.push(``);

  // Strategy Logic
  lines.push(`// ─── Strategy Logic ───────────────────────────────────────`);
  lines.push(`// Only enter when flat (matches platform: no auto position reversal)`);
  lines.push(`if longCondition and strategy.position_size == 0`);
  lines.push(`    strategy.entry("Long", strategy.long)`);
  lines.push(``);
  lines.push(`if shortCondition and strategy.position_size == 0`);
  lines.push(`    strategy.entry("Short", strategy.short)`);
  lines.push(``);
  lines.push(`// Stop Loss & Take Profit`);
  lines.push(`longSL = strategy.position_avg_price * (1 - slPct)`);
  lines.push(`longTP = strategy.position_avg_price * (1 + tpPct)`);
  lines.push(`shortSL = strategy.position_avg_price * (1 + slPct)`);
  lines.push(`shortTP = strategy.position_avg_price * (1 - tpPct)`);
  lines.push(``);
  lines.push(`if strategy.position_size > 0`);
  lines.push(`    strategy.exit("Long Exit", "Long", stop=longSL, limit=longTP)`);
  lines.push(`if strategy.position_size < 0`);
  lines.push(`    strategy.exit("Short Exit", "Short", stop=shortSL, limit=shortTP)`);
  lines.push(``);
  lines.push(`// Manual Exit Conditions`);
  lines.push(`if longExitCondition`);
  lines.push(`    strategy.close("Long")`);
  lines.push(`if shortExitCondition`);
  lines.push(`    strategy.close("Short")`);
  lines.push(``);

  // Plots
  lines.push(`// ─── Plots ────────────────────────────────────────────────`);
  if (ind.ema_fast != null) lines.push(`plot(ema_fast_val, color=color.new(color.blue, 0), linewidth=1, title="EMA Fast")`);
  if (ind.ema_slow != null) lines.push(`plot(ema_slow_val, color=color.new(color.orange, 0), linewidth=1, title="EMA Slow")`);
  if (ind.sma != null) lines.push(`plot(sma_val, color=color.new(color.purple, 0), linewidth=1, title="SMA")`);
  if (ind.wma != null) lines.push(`plot(wma_val, color=color.new(color.teal, 0), linewidth=1, title="WMA")`);
  if (ind.hma != null) lines.push(`plot(hma_val, color=color.new(color.green, 0), linewidth=1, title="HMA")`);
  if (ind.bbands != null) {
    lines.push(`plot(bb_upper, color=color.new(color.gray, 50), linewidth=1, title="BB Upper")`);
    lines.push(`plot(bb_middle, color=color.new(color.gray, 50), linewidth=1, title="BB Middle")`);
    lines.push(`plot(bb_lower, color=color.new(color.gray, 50), linewidth=1, title="BB Lower")`);
  }
  if (ind.kc != null) {
    lines.push(`plot(kc_upper_val, color=color.new(color.yellow, 50), linewidth=1, title="KC Upper")`);
    lines.push(`plot(kc_middle_val, color=color.new(color.yellow, 50), linewidth=1, title="KC Middle")`);
    lines.push(`plot(kc_lower_val, color=color.new(color.yellow, 50), linewidth=1, title="KC Lower")`);
  }
  if (ind.vwap != null) lines.push(`plot(vwap_val, color=color.new(color.aqua, 0), linewidth=1, title="VWAP")`);
  if (ind.psar != null) lines.push(`plot(psar_val, style=plot.style_circles, color=color.new(color.red, 0), linewidth=1, title="PSAR")`);

  return lines.join('\n');
}
