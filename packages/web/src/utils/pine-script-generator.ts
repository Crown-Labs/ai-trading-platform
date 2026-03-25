import { StrategyDSL } from '@ai-trading/shared';

/**
 * Converts DSL condition string to Pine Script expression
 * e.g. "rsi < 30 and ema_fast > ema_slow" → "rsi_val < 30 and ema_fast_val > ema_slow_val"
 */
function convertCondition(condition: string): string {
  return condition
    .replace(/\bcrossover\((\w+),\s*(\w+)\)/g, 'ta.crossover($1_val, $2_val)')
    .replace(/\bcrossunder\((\w+),\s*(\w+)\)/g, 'ta.crossunder($1_val, $2_val)')
    .replace(/\brsi\b/g, 'rsi_val')
    .replace(/\bema_fast\b/g, 'ema_fast_val')
    .replace(/\bema_slow\b/g, 'ema_slow_val')
    .replace(/\bsma\b/g, 'sma_val')
    .replace(/\bmacd\b/g, 'macd_line')
    .replace(/\bmacd_signal\b/g, 'macd_signal_val')
    .replace(/\bmacd_hist\b/g, 'macd_hist_val')
    .replace(/\bbb_upper\b/g, 'bb_upper')
    .replace(/\bbb_lower\b/g, 'bb_lower')
    .replace(/\bbb_middle\b/g, 'bb_middle')
    .replace(/\badx\b/g, 'adx_val')
    .replace(/\batr\b/g, 'atr_val')
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

  const lines: string[] = [];

  // Header
  lines.push(`//@version=5`);
  lines.push(`strategy("${strategy.name}", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=${risk.position_size}, commission_type=strategy.commission.percent, commission_value=${commission.toFixed(3)})`);
  lines.push(``);

  // Market info comment
  lines.push(`// Market: ${strategy.market.exchange.toUpperCase()} ${strategy.market.symbol} ${strategy.market.timeframe}`);
  if (strategy.startDate || strategy.endDate) {
    lines.push(`// Backtest period: ${strategy.startDate ?? ''} → ${strategy.endDate ?? ''}`);
  }
  lines.push(``);

  // Indicators
  lines.push(`// ─── Indicators ───────────────────────────────────────────`);

  if (ind.rsi != null) {
    lines.push(`rsi_val = ta.rsi(close, ${ind.rsi})`);
  }
  if (ind.ema_fast != null) {
    lines.push(`ema_fast_val = ta.ema(close, ${ind.ema_fast})`);
  }
  if (ind.ema_slow != null) {
    lines.push(`ema_slow_val = ta.ema(close, ${ind.ema_slow})`);
  }
  if (ind.sma != null) {
    lines.push(`sma_val = ta.sma(close, ${ind.sma})`);
  }
  if (ind.macd != null) {
    const m = ind.macd;
    lines.push(`[macd_line, macd_signal_val, macd_hist_val] = ta.macd(close, ${m.fast}, ${m.slow}, ${m.signal})`);
  }
  if (ind.bbands != null) {
    const bb = ind.bbands;
    lines.push(`[bb_middle, bb_upper, bb_lower] = ta.bb(close, ${bb.period}, ${bb.stddev})`);
  }
  if (ind.stoch != null) {
    const st = ind.stoch;
    lines.push(`stoch_k_val = ta.stoch(close, high, low, ${st.kPeriod})`);
    lines.push(`stoch_d_val = ta.sma(stoch_k_val, ${st.dPeriod})`);
  }
  if (ind.adx != null) {
    lines.push(`[adx_val, di_plus, di_minus] = ta.dmi(${ind.adx}, ${ind.adx})`);
  }
  if (ind.atr != null) {
    lines.push(`atr_val = ta.atr(${ind.atr})`);
  }
  lines.push(``);

  // Entry conditions
  lines.push(`// ─── Entry Conditions ─────────────────────────────────────`);
  const longConds = strategy.entry.condition.map(convertCondition);
  lines.push(`longCondition = ${longConds.length > 0 ? longConds.join(' and ') : 'false'}`);

  const shortConds = strategy.entry.short_condition?.map(convertCondition) ?? [];
  lines.push(`shortCondition = ${shortConds.length > 0 ? shortConds.join(' and ') : 'false'}`);
  lines.push(``);

  // Exit conditions
  lines.push(`// ─── Exit Conditions ──────────────────────────────────────`);
  const longExitConds = strategy.exit.condition.map(convertCondition);
  lines.push(`longExitCondition = ${longExitConds.length > 0 ? longExitConds.join(' and ') : 'false'}`);

  const shortExitConds = strategy.exit.short_condition?.map(convertCondition) ?? [];
  lines.push(`shortExitCondition = ${shortExitConds.length > 0 ? shortExitConds.join(' and ') : 'false'}`);
  lines.push(``);

  // Risk Management
  lines.push(`// ─── Risk Management ──────────────────────────────────────`);
  lines.push(`slPct = ${risk.stop_loss} / 100`);
  lines.push(`tpPct = ${risk.take_profit} / 100`);
  if (leverage > 1) {
    lines.push(`leverage = ${leverage}`);
  }
  lines.push(``);

  // Strategy entries/exits
  lines.push(`// ─── Strategy Logic ───────────────────────────────────────`);
  lines.push(`if longCondition`);
  lines.push(`    strategy.entry("Long", strategy.long)`);
  lines.push(``);
  lines.push(`if shortCondition`);
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
  if (ind.ema_fast != null) {
    lines.push(`plot(ema_fast_val, color=color.new(color.blue, 0), linewidth=1, title="EMA Fast")`);
  }
  if (ind.ema_slow != null) {
    lines.push(`plot(ema_slow_val, color=color.new(color.orange, 0), linewidth=1, title="EMA Slow")`);
  }
  if (ind.sma != null) {
    lines.push(`plot(sma_val, color=color.new(color.purple, 0), linewidth=1, title="SMA")`);
  }
  if (ind.bbands != null) {
    lines.push(`plot(bb_upper, color=color.new(color.gray, 50), linewidth=1, title="BB Upper")`);
    lines.push(`plot(bb_middle, color=color.new(color.gray, 50), linewidth=1, title="BB Middle")`);
    lines.push(`plot(bb_lower, color=color.new(color.gray, 50), linewidth=1, title="BB Lower")`);
  }

  return lines.join('\n');
}
