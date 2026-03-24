import { Injectable } from '@nestjs/common';
import { OHLCVCandle } from '@ai-trading/shared';

@Injectable()
export class MarketDataService {
  async getCandles(
    symbol: string,
    interval: string,
    limit: number,
  ): Promise<OHLCVCandle[]> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(
      (k: (string | number)[]): OHLCVCandle => ({
        timestamp: Number(k[0]),
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
      }),
    );
  }
}
