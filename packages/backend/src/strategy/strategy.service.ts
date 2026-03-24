import { Injectable } from '@nestjs/common';
import { StrategyDSL } from '@ai-trading/shared';

@Injectable()
export class StrategyService {
  parseFromText(text: string): StrategyDSL {
    const lower = text.toLowerCase();

    // Parse symbol
    let symbol = 'BTCUSDT';
    if (lower.includes('eth')) symbol = 'ETHUSDT';
    else if (lower.includes('sol')) symbol = 'SOLUSDT';
    else if (lower.includes('bnb')) symbol = 'BNBUSDT';

    // Parse timeframe
    let timeframe = '1h';
    if (lower.includes('1d') || lower.includes('daily')) timeframe = '1d';
    else if (lower.includes('4h')) timeframe = '4h';
    else if (lower.includes('15m') || lower.includes('15 min'))
      timeframe = '15m';
    else if (lower.includes('5m') || lower.includes('5 min')) timeframe = '5m';

    // Parse RSI period
    let rsi: number | undefined;
    const rsiMatch = lower.match(/rsi\s*(?:\(?\s*(\d+)\s*\)?)?/);
    if (rsiMatch) {
      rsi = rsiMatch[1] ? parseInt(rsiMatch[1]) : 14;
    }

    // Parse EMA periods
    let emaFast: number | undefined;
    let emaSlow: number | undefined;
    const emaMatches = lower.match(/ema\s*(?:\(?\s*(\d+)\s*\)?)/g);
    if (emaMatches) {
      const periods = emaMatches
        .map((m) => {
          const match = m.match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        })
        .filter((p): p is number => p !== null)
        .sort((a, b) => a - b);
      if (periods.length >= 2) {
        emaFast = periods[0];
        emaSlow = periods[1];
      } else if (periods.length === 1) {
        emaFast = periods[0];
      }
    }

    // Parse entry conditions
    const entryConditions: string[] = [];
    if (rsi) {
      const buyRsiMatch = lower.match(
        /(?:buy|enter|long).*rsi.*?(<|>|<=|>=)\s*(\d+)/,
      );
      const rsiBelow = lower.match(/rsi\s*(?:below|under|<)\s*(\d+)/);
      if (buyRsiMatch) {
        entryConditions.push(`rsi ${buyRsiMatch[1]} ${buyRsiMatch[2]}`);
      } else if (rsiBelow) {
        entryConditions.push(`rsi < ${rsiBelow[1]}`);
      } else {
        entryConditions.push('rsi < 30');
      }
    }
    if (emaFast && emaSlow) {
      if (
        lower.includes('cross above') ||
        lower.includes('crosses above') ||
        lower.includes('golden cross')
      ) {
        entryConditions.push('ema_fast > ema_slow');
      } else {
        entryConditions.push('ema_fast > ema_slow');
      }
    }
    if (entryConditions.length === 0) {
      entryConditions.push('rsi < 30');
      rsi = 14;
    }

    // Parse exit conditions
    const exitConditions: string[] = [];
    if (rsi) {
      const sellRsiMatch = lower.match(
        /(?:sell|exit|short).*rsi.*?(<|>|<=|>=)\s*(\d+)/,
      );
      const rsiAbove = lower.match(/rsi\s*(?:above|over|>)\s*(\d+)/);
      if (sellRsiMatch) {
        exitConditions.push(`rsi ${sellRsiMatch[1]} ${sellRsiMatch[2]}`);
      } else if (rsiAbove) {
        exitConditions.push(`rsi > ${rsiAbove[1]}`);
      } else {
        exitConditions.push('rsi > 70');
      }
    }
    if (emaFast && emaSlow) {
      exitConditions.push('ema_fast < ema_slow');
    }
    if (exitConditions.length === 0) {
      exitConditions.push('rsi > 70');
    }

    // Parse risk params
    let stopLoss = 2;
    let takeProfit = 5;
    let positionSize = 1;
    const slMatch = lower.match(
      /stop\s*(?:loss)?\s*(?:of|at|:)?\s*(\d+(?:\.\d+)?)\s*%?/,
    );
    if (slMatch) stopLoss = parseFloat(slMatch[1]);
    const tpMatch = lower.match(
      /take\s*(?:profit)?\s*(?:of|at|:)?\s*(\d+(?:\.\d+)?)\s*%?/,
    );
    if (tpMatch) takeProfit = parseFloat(tpMatch[1]);
    const psMatch = lower.match(
      /position\s*(?:size)?\s*(?:of|at|:)?\s*(\d+(?:\.\d+)?)/,
    );
    if (psMatch) positionSize = parseFloat(psMatch[1]);

    // Generate strategy name
    const indicators: string[] = [];
    if (rsi) indicators.push(`RSI(${rsi})`);
    if (emaFast) indicators.push(`EMA(${emaFast})`);
    if (emaSlow) indicators.push(`EMA(${emaSlow})`);
    const name = `${symbol} ${indicators.join(' + ')} Strategy`;

    return {
      name,
      market: {
        exchange: 'binance',
        symbol,
        timeframe,
      },
      indicator: {
        ...(rsi !== undefined && { rsi }),
        ...(emaFast !== undefined && { ema_fast: emaFast }),
        ...(emaSlow !== undefined && { ema_slow: emaSlow }),
      },
      entry: { condition: entryConditions },
      exit: { condition: exitConditions },
      risk: {
        stop_loss: stopLoss,
        take_profit: takeProfit,
        position_size: positionSize,
      },
    };
  }
}
