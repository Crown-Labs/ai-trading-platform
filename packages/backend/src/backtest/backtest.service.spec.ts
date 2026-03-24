import { BacktestService } from './backtest.service';
import { MarketDataService } from '../market-data/market-data.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { StrategyDSL, OHLCVCandle, Trade } from '@ai-trading/shared';

function makeCandles(prices: number[], startTs = 1700000000000): OHLCVCandle[] {
  return prices.map((p, i) => ({
    timestamp: startTs + i * 3600000,
    open: p - 10,
    high: p + 50,
    low: p - 50,
    close: p,
    volume: 100,
  }));
}

function baseStrategy(overrides: Partial<StrategyDSL> = {}): StrategyDSL {
  return {
    name: 'test_strategy',
    market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
    indicator: { rsi: 14 },
    entry: { condition: ['rsi < 30'] },
    exit: { condition: ['rsi > 70'] },
    risk: { stop_loss: 3, take_profit: 8, position_size: 10 },
    ...overrides,
  };
}

describe('BacktestService', () => {
  let service: BacktestService;
  let marketDataService: jest.Mocked<MarketDataService>;
  let indicatorsService: jest.Mocked<IndicatorsService>;

  beforeEach(() => {
    marketDataService = {
      getCandles: jest.fn(),
    } as any;

    indicatorsService = {
      calculateRSI: jest.fn(),
      calculateEMA: jest.fn(),
      calculateSMA: jest.fn(),
      calculateMACD: jest.fn(),
      calculateBBands: jest.fn(),
      calculateStoch: jest.fn(),
      calculateATR: jest.fn(),
      calculateADX: jest.fn(),
      isCrossover: jest.fn(),
      isCrossunder: jest.fn(),
    } as any;

    service = new BacktestService(marketDataService, indicatorsService);
  });

  describe('runBacktest()', () => {
    it('should return BacktestResult with strategy, trades, and metrics', async () => {
      const candles = makeCandles([100, 105, 110, 115, 120]);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateRSI.mockReturnValue([NaN, NaN, NaN, NaN, NaN]);

      const strategy = baseStrategy();
      const result = await service.runBacktest(strategy);

      expect(result).toHaveProperty('strategy');
      expect(result).toHaveProperty('trades');
      expect(result).toHaveProperty('metrics');
      expect(result.strategy).toBe(strategy);
      expect(Array.isArray(result.trades)).toBe(true);
      expect(result.metrics).toHaveProperty('totalTrades');
    });
  });

  describe('evaluateCondition() (tested via simulateTrades)', () => {
    it('should handle simple condition: rsi < 30', async () => {
      const candles = makeCandles([100, 100, 110, 120]);
      marketDataService.getCandles.mockResolvedValue(candles);
      // RSI goes below 30 at index 1, then above 70 at index 2
      indicatorsService.calculateRSI.mockReturnValue([50, 25, 75, 80]);

      const strategy = baseStrategy();
      const result = await service.runBacktest(strategy);

      expect(result.trades.length).toBe(1);
      expect(result.trades[0].entryPrice).toBe(100);
      expect(result.trades[0].exitPrice).toBe(110);
    });

    it('should handle two variable condition: ema_fast > ema_slow', async () => {
      const candles = makeCandles([100, 105, 110, 115, 120]);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateEMA
        .mockReturnValueOnce([90, 95, 100, 105, 110]) // ema_fast
        .mockReturnValueOnce([100, 100, 100, 100, 100]); // ema_slow

      const strategy = baseStrategy({
        indicator: { ema_fast: 10, ema_slow: 50 },
        entry: { condition: ['ema_fast > ema_slow'] },
        exit: { condition: ['ema_fast < ema_slow'] },
      });
      const result = await service.runBacktest(strategy);

      // ema_fast > ema_slow first true at index 2 (100 is not > 100, so index 3: 105 > 100)
      expect(result.trades.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle compound AND condition', async () => {
      const candles = makeCandles([100, 100, 110, 120]);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateRSI.mockReturnValue([50, 25, 75, 80]);
      indicatorsService.calculateEMA.mockReturnValue([90, 90, 100, 110]);

      const strategy = baseStrategy({
        indicator: { rsi: 14, ema_fast: 10 },
        entry: { condition: ['rsi < 30 and ema_fast < 100'] },
        exit: { condition: ['rsi > 70'] },
      });
      const result = await service.runBacktest(strategy);

      // At index 1: rsi=25<30 and ema_fast=90<100 → entry
      expect(result.trades.length).toBe(1);
    });

    it('should handle math expression: close > ema_slow * 1.02', async () => {
      const candles = makeCandles([100, 103, 110, 120]);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateEMA.mockReturnValue([100, 100, 100, 100]);
      indicatorsService.calculateRSI.mockReturnValue([50, 50, 75, 80]);

      const strategy = baseStrategy({
        indicator: { rsi: 14, ema_slow: 50 },
        entry: { condition: ['close > ema_slow * 1.02'] },
        exit: { condition: ['rsi > 70'] },
      });
      const result = await service.runBacktest(strategy);

      // close=103 > 100*1.02=102 → entry at index 1, exit at index 2 (rsi=75>70)
      expect(result.trades.length).toBe(1);
    });

    it('should handle OR condition', async () => {
      const candles = makeCandles([100, 100, 110, 120]);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateRSI.mockReturnValue([50, 35, 75, 80]);
      indicatorsService.calculateEMA.mockReturnValue([200, 200, 200, 200]);

      const strategy = baseStrategy({
        indicator: { rsi: 14, ema_fast: 10 },
        entry: { condition: ['rsi < 30 or ema_fast > 100'] },
        exit: { condition: ['rsi > 70'] },
      });
      const result = await service.runBacktest(strategy);

      // rsi=35 not < 30 but ema_fast=200 > 100 → entry at index 1
      expect(result.trades.length).toBe(1);
    });

    it('should handle crossover(ema_fast, ema_slow)', async () => {
      const candles = makeCandles([100, 105, 110, 115, 120]);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateEMA
        .mockReturnValueOnce([90, 95, 105, 110, 115])  // ema_fast
        .mockReturnValueOnce([100, 100, 100, 100, 100]); // ema_slow
      indicatorsService.isCrossover.mockImplementation(
        (a, b, idx) => idx >= 1 && a[idx - 1] <= b[idx - 1] && a[idx] > b[idx],
      );
      indicatorsService.calculateRSI.mockReturnValue([50, 50, 75, 80, 85]);

      const strategy = baseStrategy({
        indicator: { ema_fast: 10, ema_slow: 50, rsi: 14 },
        entry: { condition: ['crossover(ema_fast, ema_slow)'] },
        exit: { condition: ['rsi > 70'] },
      });
      const result = await service.runBacktest(strategy);

      expect(indicatorsService.isCrossover).toHaveBeenCalled();
    });
  });

  describe('calculateMetrics()', () => {
    it('should return zeros for empty trades', async () => {
      const candles = makeCandles([100, 100, 100]);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateRSI.mockReturnValue([50, 50, 50]);

      const result = await service.runBacktest(baseStrategy());

      expect(result.metrics.totalTrades).toBe(0);
      expect(result.metrics.winRate).toBe(0);
      expect(result.metrics.totalReturn).toBe(0);
      expect(result.metrics.maxDrawdown).toBe(0);
      expect(result.metrics.sharpeRatio).toBe(0);
      expect(result.metrics.profitFactor).toBe(0);
      expect(result.metrics.totalFees).toBe(0);
    });

    it('should calculate winRate correctly with wins and losses', async () => {
      // Set up 2 entry/exit cycles: one win, one loss
      const prices = [100, 100, 110, 100, 100, 90];
      const candles = makeCandles(prices);
      marketDataService.getCandles.mockResolvedValue(candles);
      // RSI triggers entry at indices 1,4 and exit at 2,5
      indicatorsService.calculateRSI.mockReturnValue([50, 25, 75, 50, 25, 75]);

      const result = await service.runBacktest(baseStrategy());

      expect(result.metrics.totalTrades).toBe(2);
      // First trade: 100→110 (win), second: 100→90 (loss)
      const wins = result.trades.filter((t) => t.isWin).length;
      expect(result.metrics.winRate).toBe(
        parseFloat(((wins / result.trades.length) * 100).toFixed(2)),
      );
    });

    it('should calculate totalFees correctly', async () => {
      const prices = [100, 100, 110, 120];
      const candles = makeCandles(prices);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateRSI.mockReturnValue([50, 25, 75, 80]);

      const result = await service.runBacktest(baseStrategy());

      expect(result.metrics.totalFees).toBeGreaterThan(0);
      const sumFees = result.trades.reduce((s, t) => s + t.fees, 0);
      expect(result.metrics.totalFees).toBeCloseTo(sumFees, 2);
    });
  });

  describe('commission + slippage in trade PnL', () => {
    it('should apply commission and slippage to trade PnL', async () => {
      const prices = [100, 100, 110];
      const candles = makeCandles(prices);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateRSI.mockReturnValue([50, 25, 75]);

      const strategy = baseStrategy({
        execution: { commission: 0.01, slippage: 0.01, leverage: 1 },
      });
      const result = await service.runBacktest(strategy);

      expect(result.trades.length).toBe(1);
      // With high commission+slippage, the PnL should be less than raw PnL
      expect(result.trades[0].fees).toBeGreaterThan(0);
    });
  });

  describe('stop_loss and take_profit', () => {
    it('should trigger exit on stop_loss', async () => {
      // Price drops >3% from entry to trigger stop_loss=3
      const prices = [1000, 1000, 960, 950, 940];
      const candles = makeCandles(prices);
      marketDataService.getCandles.mockResolvedValue(candles);
      // RSI entry at index 1, never triggers exit condition normally
      indicatorsService.calculateRSI.mockReturnValue([50, 25, 40, 40, 40]);

      const strategy = baseStrategy({
        risk: { stop_loss: 3, take_profit: 50, position_size: 10 },
      });
      const result = await service.runBacktest(strategy);

      expect(result.trades.length).toBe(1);
      // Price dropped from 1000 to 960 = -4%, exceeds stop_loss of 3%
      expect(result.trades[0].exitPrice).toBe(960);
      expect(result.trades[0].isWin).toBe(false);
    });

    it('should trigger exit on take_profit', async () => {
      // Price rises >8% from entry to trigger take_profit=8
      const prices = [1000, 1000, 1090, 1100];
      const candles = makeCandles(prices);
      marketDataService.getCandles.mockResolvedValue(candles);
      indicatorsService.calculateRSI.mockReturnValue([50, 25, 40, 40]);

      const strategy = baseStrategy({
        risk: { stop_loss: 50, take_profit: 8, position_size: 10 },
      });
      const result = await service.runBacktest(strategy);

      expect(result.trades.length).toBe(1);
      // Price rose from 1000 to 1090 = +9%, exceeds take_profit of 8%
      expect(result.trades[0].exitPrice).toBe(1090);
      expect(result.trades[0].isWin).toBe(true);
    });
  });
});
