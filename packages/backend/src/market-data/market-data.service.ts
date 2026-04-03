import { Injectable, Logger } from '@nestjs/common';
import { OHLCVCandle } from '@ai-trading/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(private prisma: PrismaService) {}

  async getCandles(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit = 500,
  ): Promise<OHLCVCandle[]> {
    // Try cache first when we have a date range
    if (startTime) {
      const cached = await this.getCachedCandles(
        symbol,
        interval,
        startTime,
        endTime,
      );
      if (cached.length > 0) {
        return cached;
      }
    }

    const candles = await this.fetchFromBinance(
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    );

    // Cache results in background (fire-and-forget)
    if (candles.length > 0) {
      this.cacheCandles(symbol, interval, candles).catch((err) =>
        this.logger.warn(`Failed to cache candles: ${err.message}`),
      );
    }

    return candles;
  }

  private async getCachedCandles(
    symbol: string,
    interval: string,
    startTime: number,
    endTime?: number,
  ): Promise<OHLCVCandle[]> {
    try {
      const where: any = {
        symbol,
        timeframe: interval,
        timestamp: { gte: BigInt(startTime) },
      };
      if (endTime) {
        where.timestamp.lte = BigInt(endTime);
      }

      const rows = await this.prisma.candleCache.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });

      if (rows.length === 0) return [];

      return rows.map((r) => ({
        timestamp: Number(r.timestamp),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));
    } catch {
      return [];
    }
  }

  private async cacheCandles(
    symbol: string,
    interval: string,
    candles: OHLCVCandle[],
  ) {
    const data = candles.map((c) => ({
      symbol,
      timeframe: interval,
      timestamp: BigInt(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    await this.prisma.candleCache.createMany({
      data,
      skipDuplicates: true,
    });
  }

  private async fetchFromBinance(
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
