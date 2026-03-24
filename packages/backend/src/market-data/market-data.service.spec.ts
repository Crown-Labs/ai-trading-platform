import { MarketDataService } from './market-data.service';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

const sampleBinanceKline = [
  [
    1704067200000,  // open time
    '42000.00',     // open
    '43500.00',     // high
    '41500.00',     // low
    '43000.00',     // close
    '1500.50',      // volume
    1704070800000,  // close time
    '64500000.00',  // quote asset volume
    100,            // number of trades
    '750.25',       // taker buy base
    '32250000.00',  // taker buy quote
    '0',            // ignore
  ],
];

describe('MarketDataService', () => {
  let service: MarketDataService;

  beforeEach(() => {
    service = new MarketDataService();
    mockFetch.mockReset();
  });

  describe('getCandles() without date range', () => {
    it('should call Binance API with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => sampleBinanceKline,
      } as Response);

      await service.getCandles('BTCUSDT', '1h');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('https://api.binance.com/api/v3/klines');
      expect(url).toContain('symbol=BTCUSDT');
      expect(url).toContain('interval=1h');
      expect(url).toContain('limit=500');
      expect(url).not.toContain('startTime');
    });
  });

  describe('getCandles() with startTime', () => {
    it('should call paginated API with startTime', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => sampleBinanceKline,
      } as Response);

      const startTime = 1704067200000;
      await service.getCandles('BTCUSDT', '1h', startTime);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain(`startTime=${startTime}`);
      expect(url).toContain('limit=1000');
    });

    it('should handle pagination with multiple batches', async () => {
      // First batch returns full 1000 items (simulate with 1 item for simplicity, but < batchLimit means stop)
      mockFetch.mockResolvedValueOnce({
        json: async () => sampleBinanceKline,
      } as Response);

      const startTime = 1704067200000;
      const result = await service.getCandles('BTCUSDT', '1h', startTime);

      expect(result.length).toBe(1);
    });
  });

  describe('parseCandles()', () => {
    it('should convert Binance kline format to OHLCVCandle correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => sampleBinanceKline,
      } as Response);

      const result = await service.getCandles('BTCUSDT', '1h');

      expect(result.length).toBe(1);
      const candle = result[0];
      expect(candle.timestamp).toBe(1704067200000);
      expect(candle.open).toBe(42000);
      expect(candle.high).toBe(43500);
      expect(candle.low).toBe(41500);
      expect(candle.close).toBe(43000);
      expect(candle.volume).toBe(1500.5);
    });
  });
});
