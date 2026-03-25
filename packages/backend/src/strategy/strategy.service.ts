import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { StrategyDSL } from '@ai-trading/shared';
import YAML from 'yaml';

const PARSE_SYSTEM_PROMPT = `You are a trading strategy parser. Convert the user's natural language description into a StrategyDSL YAML document.

Output ONLY valid YAML with no code fences, no explanation, no markdown. Just raw YAML.

Required top-level keys: strategy (with name), market, indicator, entry, exit, risk.
Optional: execution (commission, slippage, leverage).

Example output:
strategy:
  name: rsi_trend_pullback
market:
  exchange: binance
  symbol: BTCUSDT
  timeframe: 4h
indicator:
  rsi: 14
  ema_fast: 20
  ema_slow: 50
entry:
  condition:
    - "rsi < 40 and ema_fast > ema_slow"
  short_condition:
    - "rsi > 60 and ema_fast < ema_slow"
exit:
  condition:
    - "rsi > 70 or crossunder(ema_fast, ema_slow)"
  short_condition:
    - "rsi < 30 or crossover(ema_fast, ema_slow)"
risk:
  stop_loss: 4
  take_profit: 12
  position_size: 8
execution:
  commission: 0.001
  slippage: 0.0005
  leverage: 1

Rules:
- market.exchange: always "binance"
- market.symbol: USDT pairs (BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, ADAUSDT, etc.)
- market.timeframe: "1m", "5m", "15m", "1h", "4h", "1d"

Available Indicators (23+):
  Moving Averages: rsi, sma, ema_fast, ema_slow, wma, dema, tema, hma, vwap
  Oscillators: rsi, stochrsi, cci, roc, willr, mfi
  Trend: macd, adx, aroon, psar
  Volatility: atr, bbands, kc (Keltner Channels)
  Volume: obv, cmf
  Complex: stoch (Stochastic), macd (requires fast/slow/signal)

  Examples:
  - Simple: rsi: 14, sma: 50, atr: 14
  - EMA variations: ema_fast: 20, ema_slow: 200
  - Complex: macd: { fast: 12, slow: 26, signal: 9 }
  - Bands: bbands: { period: 20, stddev: 2 }
  - Stochastic: stoch: { kPeriod: 14, dPeriod: 3 }
  - Keltner: kc: { period: 20, multiple: 2 }
  - Aroon: aroon: 25
  - PSAR: psar: { step: 0.02, max: 0.2 }

Condition Variables:
  - Indicators: rsi, sma, ema_fast, ema_slow, wma, dema, tema, hma, atr, adx, cci, vwap, obv, roc, stochrsi, willr, mfi, cmf, psar
  - MACD: macd, macd_signal, macd_histogram
  - Bollinger: bb_upper, bb_middle, bb_lower
  - Stochastic: stoch_k, stoch_d
  - Keltner: kc_upper, kc_middle, kc_lower
  - Aroon: aroon_up, aroon_down
  - Base: close, volume

Condition Functions:
  - Comparisons: <, >, <=, >=, ==, !=
  - Logic: and, or
  - Crossovers: crossover(a, b), crossunder(a, b)
  - Math: +, -, *, /

  Examples:
  - "rsi < 30 and close > sma"
  - "ema_fast > ema_slow and close > bb_lower"
  - "crossover(ema_fast, ema_slow)"
  - "macd > macd_signal and macd_histogram > 0"
  - "stoch_k < 20 and stoch_k > stoch_d"

Entry/Exit:
  - entry.condition: array of conditions for LONG entry
  - entry.short_condition: (optional) array of conditions for SHORT entry
  - exit.condition: array of conditions for LONG exit
  - exit.short_condition: (optional) array of conditions for SHORT exit

Risk Management:
  - stop_loss: percentage (e.g., 2 = 2%)
  - take_profit: percentage (e.g., 5 = 5%)
  - position_size: percentage of capital per trade (e.g., 1 = 1%, 10 = 10%)

Execution (optional):
  - commission: decimal (default 0.001 = 0.1%)
  - slippage: decimal (default 0.0005 = 0.05%)
  - leverage: number (default 1 = spot, >1 = futures)

Output Requirements:
- ONLY output valid YAML
- NO code fences (no \`\`\`yaml)
- NO explanations or commentary
- Start with "strategy:" immediately`;

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  private get gatewayUrl(): string {
    return process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
  }

  private get gatewayToken(): string {
    return process.env.OPENCLAW_GATEWAY_TOKEN || '';
  }

  private get agentId(): string {
    return process.env.OPENCLAW_AGENT_ID || 'trading-bot';
  }

  async parseFromText(text: string): Promise<StrategyDSL> {
    const url = `${this.gatewayUrl}/v1/chat/completions`;

    const body = JSON.stringify({
      model: this.agentId,
      messages: [
        { role: 'system', content: PARSE_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      stream: false,
    });

    this.logger.log(`Calling OpenClaw Gateway for strategy parse: ${url}`);

    let yamlText: string;

    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.gatewayToken}`,
        },
        body,
      });

      if (!upstream.ok) {
        const errorText = await upstream.text();
        this.logger.error(`Gateway error: ${upstream.status} ${errorText}`);
        throw new BadRequestException(
          `Gateway error: ${upstream.status}`,
        );
      }

      const json = await upstream.json();
      yamlText = json.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Failed to call OpenClaw Gateway', err);
      throw new BadRequestException('Failed to reach AI gateway');
    }

    if (!yamlText.trim()) {
      throw new BadRequestException('AI returned empty response');
    }

    // Strip any accidental code fences
    yamlText = yamlText
      .replace(/^```(?:yaml|strategy)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = YAML.parse(yamlText);
    } catch {
      throw new BadRequestException('AI returned invalid YAML');
    }

    return this.validateAndBuild(parsed);
  }

  private validateAndBuild(raw: Record<string, unknown>): StrategyDSL {
    const p = raw as Record<string, unknown>;

    // Support nested { strategy: { name } } or flat { name }
    const strategyBlock = p.strategy as Record<string, unknown> | undefined;
    const name =
      (strategyBlock?.name as string) ?? (p.name as string) ?? '';
    const market = p.market as Record<string, unknown> | undefined;
    const indicator = p.indicator as Record<string, unknown> | undefined;
    const entry = p.entry as Record<string, unknown> | undefined;
    const exit = p.exit as Record<string, unknown> | undefined;
    const risk = p.risk as Record<string, unknown> | undefined;

    if (!name) {
      throw new BadRequestException('Missing required field: name');
    }
    if (!market?.symbol || !market?.timeframe) {
      throw new BadRequestException('Missing required field: market (symbol, timeframe)');
    }
    if (!indicator || Object.keys(indicator).length === 0) {
      throw new BadRequestException('Missing required field: indicator');
    }
    const entryConditions = entry?.condition as string[] | undefined;
    const entryShortConditions = entry?.short_condition as string[] | undefined;
    if (!entryConditions?.length) {
      throw new BadRequestException('Missing required field: entry.condition');
    }
    const exitConditions = exit?.condition as string[] | undefined;
    const exitShortConditions = exit?.short_condition as string[] | undefined;
    if (!exitConditions?.length) {
      throw new BadRequestException('Missing required field: exit.condition');
    }
    if (
      risk?.stop_loss == null ||
      risk?.take_profit == null ||
      risk?.position_size == null
    ) {
      throw new BadRequestException('Missing required field: risk (stop_loss, take_profit, position_size)');
    }

    const execution = p.execution as Record<string, unknown> | undefined;

    return {
      name,
      market: {
        exchange: (market.exchange as string) || 'binance',
        symbol: market.symbol as string,
        timeframe: market.timeframe as string,
      },
      indicator: Object.fromEntries(
        Object.entries(indicator).map(([key, value]) => [
          key,
          typeof value === 'number' ? value : Number(value),
        ]),
      ),
      entry: {
        condition: entryConditions,
        ...(entryShortConditions?.length && { short_condition: entryShortConditions }),
      },
      exit: {
        condition: exitConditions,
        ...(exitShortConditions?.length && { short_condition: exitShortConditions }),
      },
      risk: {
        stop_loss: Number(risk.stop_loss),
        take_profit: Number(risk.take_profit),
        position_size: Number(risk.position_size),
      },
      ...(execution && {
        execution: {
          commission: Number(execution.commission ?? 0.001),
          slippage: Number(execution.slippage ?? 0.0005),
          leverage: Number(execution.leverage ?? 1),
        },
      }),
    };
  }
}
