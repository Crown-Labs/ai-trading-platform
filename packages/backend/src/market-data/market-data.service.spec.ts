import { MarketDataService } from './market-data.service';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

function makeBinanceKline(timestamp: number, close: number): any[] {
  return [
    timestamp,        // 0: open time
    '42000.00',       // 1: open
    '43000.00',       // 2: high
    '41000.00',       // 3: low
    String(close),    // 4: close
    '100.5',          // 5: volume
    timestamp + 3600000, // 6: close time
    '4200000',        // 7: quote volume
    50,               // 8: trades
    '50.0',           // 9: taker buy base
    '2100000',        // 10: taker buy quote
    '0',              // 11: ignore
  ];
}

describe('Issue #2 — MarketDataService', () => {
  let service: MarketDataService;

  beforeEach(() => {
    service = new MarketDataService();
    mockFetch.mockReset();
  });

  it('fetches Binance API with correct URL (no startTime)', async () => {
    const klines = [makeBinanceKline(1704067200000, 42800)];
    mockFetch.mockResolvedValueOnce({
      json: async () => klines,
    });

    await service.getCandles('BTCUSDT', '1h');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('https://api.binance.com/api/v3/klines');
    expect(url).toContain('symbol=BTCUSDT');
    expect(url).toContain('interval=1h');
    expect(url).toContain('limit=500');
  });

  it('parseCandles converts kline format correctly', async () => {
    const klines = [makeBinanceKline(1704067200000, 42800)];
    mockFetch.mockResolvedValueOnce({
      json: async () => klines,
    });

    const candles = await service.getCandles('BTCUSDT', '1h');

    expect(candles).toHaveLength(1);
    expect(candles[0]).toEqual({
      timestamp: 1704067200000,
      open: 42000,
      high: 43000,
      low: 41000,
      close: 42800,
      volume: 100.5,
    });
  });
});

describe('Issue #9 — Date range pagination', () => {
  let service: MarketDataService;

  beforeEach(() => {
    service = new MarketDataService();
    mockFetch.mockReset();
  });

  it('getCandles with startTime paginates correctly (max 1000/batch)', async () => {
    // First batch: 1000 candles
    const batch1 = Array.from({ length: 1000 }, (_, i) =>
      makeBinanceKline(1704067200000 + i * 3600000, 42000 + i),
    );
    // Second batch: 500 candles (< 1000, triggers break)
    const batch2 = Array.from({ length: 500 }, (_, i) =>
      makeBinanceKline(1704067200000 + (1000 + i) * 3600000, 43000 + i),
    );

    mockFetch
      .mockResolvedValueOnce({ json: async () => batch1 })
      .mockResolvedValueOnce({ json: async () => batch2 });

    const candles = await service.getCandles(
      'BTCUSDT',
      '1h',
      1704067200000,
      undefined,
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(candles).toHaveLength(1500);

    // Verify second call uses startTime from last candle + 1
    const secondUrl = mockFetch.mock.calls[1][0] as string;
    expect(secondUrl).toContain('startTime=');
  });

  it('stops pagination when endTime reached', async () => {
    const endTime = 1704070800000; // 1 hour after start
    const batch = [makeBinanceKline(1704067200000, 42000), makeBinanceKline(endTime, 42100)];

    mockFetch.mockResolvedValueOnce({ json: async () => batch });

    const candles = await service.getCandles(
      'BTCUSDT',
      '1h',
      1704067200000,
      endTime,
    );

    // Should stop after first batch since length < 1000
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(candles.length).toBe(2);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain(`endTime=${endTime}`);
  });

  it('handles empty response', async () => {
    mockFetch.mockResolvedValueOnce({ json: async () => [] });

    const candles = await service.getCandles(
      'BTCUSDT',
      '1h',
      1704067200000,
    );

    expect(candles).toHaveLength(0);
  });
});
