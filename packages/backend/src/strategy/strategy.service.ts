import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { StrategyDSL } from '@ai-trading/shared';
import YAML from 'yaml';

const PARSE_SYSTEM_PROMPT = `You are a trading strategy parser. Convert the user's natural language description into a StrategyDSL YAML document.

Output ONLY valid YAML with no code fences, no explanation, no markdown. Just raw YAML.

Required top-level keys: strategy (with name), market, indicator, entry, exit, risk.

Example output:
strategy:
  name: btc_rsi_strategy
market:
  exchange: binance
  symbol: BTCUSDT
  timeframe: 1h
indicator:
  rsi: 14
entry:
  condition:
    - "rsi < 30"
exit:
  condition:
    - "rsi > 70"
risk:
  stop_loss: 2
  take_profit: 5
  position_size: 1

Rules:
- market.exchange: always "binance"
- market.symbol: USDT pairs (BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, etc.)
- market.timeframe: "1m", "5m", "15m", "1h", "4h", "1d"
- indicator: rsi (period), ema_fast (period), ema_slow (period), sma, macd, bbands, stoch, atr, adx
- entry/exit.condition: array of condition strings e.g. "rsi < 30", "ema_fast > ema_slow"
- risk.stop_loss / take_profit: percentage number
- risk.position_size: percentage of capital per trade
- Output ONLY YAML. No fences. No explanation.`;

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
    if (!entryConditions?.length) {
      throw new BadRequestException('Missing required field: entry.condition');
    }
    const exitConditions = exit?.condition as string[] | undefined;
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
      indicator: {
        ...(indicator.rsi != null && { rsi: Number(indicator.rsi) }),
        ...(indicator.ema_fast != null && { ema_fast: Number(indicator.ema_fast) }),
        ...(indicator.ema_slow != null && { ema_slow: Number(indicator.ema_slow) }),
        ...(indicator.sma != null && { sma: Number(indicator.sma) }),
        ...(indicator.atr != null && { atr: Number(indicator.atr) }),
        ...(indicator.adx != null && { adx: Number(indicator.adx) }),
      },
      entry: { condition: entryConditions },
      exit: { condition: exitConditions },
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
