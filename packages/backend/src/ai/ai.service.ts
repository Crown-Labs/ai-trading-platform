import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are an AI trading strategy assistant. When the user describes a trading strategy, respond in two parts:

1. A friendly analysis/explanation of the strategy in plain text.

2. If the user describes a strategy, output a valid StrategyDSL YAML block wrapped in a code fence like this:

\`\`\`strategy
name: "BTCUSDT RSI(14) Strategy"
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
\`\`\`

Rules for the YAML block:
- name: descriptive name for the strategy
- market.exchange: always "binance"
- market.symbol: use USDT pairs (e.g., BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT)
- market.timeframe: one of "1h", "4h", "1d", "15m", "5m"
- indicator: include rsi (period), ema_fast (period), and/or ema_slow (period) as needed
- entry.condition: array of condition strings like "rsi < 30", "ema_fast > ema_slow"
- exit.condition: array of condition strings like "rsi > 70", "ema_fast < ema_slow"
- risk: stop_loss and take_profit as percentages, position_size as a multiplier

Only output the strategy YAML block when the user is clearly describing a trading strategy. For general questions, just respond with helpful text.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private get gatewayUrl(): string {
    return process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
  }

  private get gatewayToken(): string {
    return process.env.OPENCLAW_GATEWAY_TOKEN || '';
  }

  private get agentId(): string {
    return process.env.OPENCLAW_AGENT_ID || 'trading-bot';
  }

  async streamStrategyChat(
    messages: ChatMessage[],
    res: Response,
    sessionId?: string,
  ): Promise<void> {
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    const url = `${this.gatewayUrl}/v1/chat/completions`;

    const body = JSON.stringify({
      model: this.agentId,
      messages: fullMessages,
      stream: true,
      ...(sessionId && { user: sessionId }),
    });

    this.logger.log(`Calling OpenClaw Gateway: ${url}`);

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
      this.logger.error(
        `OpenClaw Gateway error: ${upstream.status} ${errorText}`,
      );
      res.status(upstream.status).json({
        error: `Gateway error: ${upstream.status}`,
        details: errorText,
      });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = upstream.body?.getReader();
    if (!reader) {
      res.end();
      return;
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } catch (err) {
      this.logger.error('Stream error:', err);
    } finally {
      res.end();
    }
  }
}
