import { Injectable } from '@nestjs/common';
import { OHLCVCandle } from '@ai-trading/shared';

@Injectable()
export class MarketDataService {
  async getCandles(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit = 500,
  ): Promise<OHLCVCandle[]> {
    if (!startTime) {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url);
      const data = await res.json();
      return this.parseCandles(data);
    }

    const allCandles: OHLCVCandle[] = [];
    let currentStart = startTime;
    const batchLimit = 1000;

    while (true) {
      let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${currentStart}&limit=${batchLimit}`;
      if (endTime) url += `&endTime=${endTime}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      const candles = this.parseCandles(data);
      allCandles.push(...candles);

      if (data.length < batchLimit) break;
      if (endTime && candles[candles.length - 1].timestamp >= endTime) break;

      currentStart = candles[candles.length - 1].timestamp + 1;
      await new Promise((r) => setTimeout(r, 100));
    }

    return allCandles;
  }

  private parseCandles(data: any[]): OHLCVCandle[] {
    return data.map((k: any[]) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  }
}
