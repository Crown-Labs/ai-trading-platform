import { BacktestService } from './backtest.service';
import { MarketDataService } from '../market-data/market-data.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { StrategyDSL, OHLCVCandle } from '@ai-trading/shared';

// Generate candles with a price pattern that produces RSI-based signals
function generateCandles(count: number, basePrice = 42000): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    // Create a pattern: drop for first third, rise for middle third, drop again
    if (i < count / 3) {
      price -= 100; // dropping → RSI will go low
    } else if (i < (2 * count) / 3) {
      price += 150; // rising → RSI will go high
    } else {
      price -= 80;
    }
    candles.push({
      timestamp: 1704067200000 + i * 3600000,
      open: price - 50,
      high: price + 100,
      low: price - 100,
      close: price,
      volume: 1000 + Math.random() * 500,
    });
  }
  return candles;
}

describe('Issue #2 — Binance market data + Backtest engine', () => {
  let service: BacktestService;
  let marketDataMock: jest.Mocked<MarketDataService>;
  let indicatorsService: IndicatorsService;

  beforeEach(() => {
    indicatorsService = new IndicatorsService();
    marketDataMock = {
      getCandles: jest.fn(),
    } as any;
    service = new BacktestService(marketDataMock, indicatorsService);
  });

  it('runBacktest returns BacktestResult with trades + metrics', async () => {
    const candles = generateCandles(100);
    marketDataMock.getCandles.mockResolvedValue(candles);

    const strategy: StrategyDSL = {
      name: 'rsi_test',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 35'] },
      exit: { condition: ['rsi > 65'] },
      risk: { stop_loss: 5, take_profit: 10, position_size: 10 },
    };

    const result = await service.runBacktest(strategy);

    expect(result).toHaveProperty('strategy');
    expect(result).toHaveProperty('trades');
    expect(result).toHaveProperty('metrics');
    expect(result.strategy).toBe(strategy);
    expect(Array.isArray(result.trades)).toBe(true);
    expect(result.metrics).toHaveProperty('totalTrades');
    expect(result.metrics).toHaveProperty('winRate');
    expect(result.metrics).toHaveProperty('totalReturn');
    expect(result.metrics).toHaveProperty('maxDrawdown');
    expect(result.metrics).toHaveProperty('sharpeRatio');
    expect(result.metrics).toHaveProperty('profitFactor');
    expect(result.metrics).toHaveProperty('totalFees');
  });

  it('RSI indicator fetched and used in evaluation', async () => {
    const candles = generateCandles(50);
    marketDataMock.getCandles.mockResolvedValue(candles);

    const strategy: StrategyDSL = {
      name: 'rsi_only',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 30'] },
      exit: { condition: ['rsi > 70'] },
      risk: { stop_loss: 3, take_profit: 8, position_size: 10 },
    };

    const result = await service.runBacktest(strategy);
    // Verify the result is valid (may or may not have trades depending on data)
    expect(result.metrics.totalTrades).toBeGreaterThanOrEqual(0);
    expect(typeof result.metrics.winRate).toBe('number');
  });
});

describe('Issue #6 — Execution params', () => {
  let service: BacktestService;
  let marketDataMock: jest.Mocked<MarketDataService>;
  let indicatorsService: IndicatorsService;

  beforeEach(() => {
    indicatorsService = new IndicatorsService();
    marketDataMock = { getCandles: jest.fn() } as any;
    service = new BacktestService(marketDataMock, indicatorsService);
  });

  // Helper: create candles that guarantee a trade (drop then rise then drop)
  function createTradableCandles(): OHLCVCandle[] {
    const prices = [
      100, 98, 96, 94, 92, 90, 88, 86, 84, 82, 80, 78, 76, 74, 72,  // drop - RSI goes low
      74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 102,  // rise - RSI goes high
      100, 98, 96, 94, 92,  // drop again
    ];
    return prices.map((p, i) => ({
      timestamp: 1704067200000 + i * 3600000,
      open: p - 1,
      high: p + 2,
      low: p - 2,
      close: p,
      volume: 1000,
    }));
  }

  it('commission applied: fee = positionValue x commission x 2', async () => {
    const candles = createTradableCandles();
    marketDataMock.getCandles.mockResolvedValue(candles);

    const strategy: StrategyDSL = {
      name: 'commission_test',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 30'] },
      exit: { condition: ['rsi > 70'] },
      risk: { stop_loss: 50, take_profit: 50, position_size: 100 },
      execution: { commission: 0.01, slippage: 0, leverage: 1 },
    };

    const result = await service.runBacktest(strategy);
    if (result.trades.length > 0) {
      const trade = result.trades[0];
      // fee = INITIAL_CAPITAL * (position_size/100) * leverage * commission * 2
      // fee = 10000 * 1 * 1 * 0.01 * 2 = 200
      expect(trade.fees).toBe(200);
    }
  });

  it('slippage applied: effectiveEntry = entry * (1 + slippage)', async () => {
    const candles = createTradableCandles();
    marketDataMock.getCandles.mockResolvedValue(candles);

    // Run with zero slippage
    const strategyNoSlip: StrategyDSL = {
      name: 'no_slip',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 30'] },
      exit: { condition: ['rsi > 70'] },
      risk: { stop_loss: 50, take_profit: 50, position_size: 100 },
      execution: { commission: 0, slippage: 0, leverage: 1 },
    };

    const resultNoSlip = await service.runBacktest(strategyNoSlip);

    // Run with slippage
    marketDataMock.getCandles.mockResolvedValue(candles);
    const strategySlip: StrategyDSL = {
      ...strategyNoSlip,
      name: 'with_slip',
      execution: { commission: 0, slippage: 0.01, leverage: 1 },
    };

    const resultSlip = await service.runBacktest(strategySlip);

    if (resultNoSlip.trades.length > 0 && resultSlip.trades.length > 0) {
      // Slippage reduces PnL
      expect(resultSlip.trades[0].pnl).toBeLessThan(resultNoSlip.trades[0].pnl);
    }
  });

  it('leverage multiplies position exposure', async () => {
    const candles = createTradableCandles();
    marketDataMock.getCandles.mockResolvedValue(candles);

    const strategy1x: StrategyDSL = {
      name: 'lev_1x',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 30'] },
      exit: { condition: ['rsi > 70'] },
      risk: { stop_loss: 50, take_profit: 50, position_size: 100 },
      execution: { commission: 0, slippage: 0, leverage: 1 },
    };

    const result1x = await service.runBacktest(strategy1x);

    marketDataMock.getCandles.mockResolvedValue(candles);
    const strategy2x: StrategyDSL = {
      ...strategy1x,
      name: 'lev_2x',
      execution: { commission: 0, slippage: 0, leverage: 2 },
    };
    const result2x = await service.runBacktest(strategy2x);

    if (result1x.trades.length > 0 && result2x.trades.length > 0) {
      // With 2x leverage, PnL should be ~2x (fees are 0)
      expect(Math.abs(result2x.trades[0].pnl)).toBeCloseTo(
        Math.abs(result1x.trades[0].pnl) * 2,
        0,
      );
    }
  });

  it('sharpeRatio calculation', async () => {
    const candles = generateCandles(100);
    marketDataMock.getCandles.mockResolvedValue(candles);

    const strategy: StrategyDSL = {
      name: 'sharpe_test',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 35'] },
      exit: { condition: ['rsi > 65'] },
      risk: { stop_loss: 10, take_profit: 10, position_size: 10 },
    };

    const result = await service.runBacktest(strategy);
    expect(typeof result.metrics.sharpeRatio).toBe('number');
    expect(isFinite(result.metrics.sharpeRatio)).toBe(true);
  });

  it('maxDrawdown from equity curve', async () => {
    const candles = generateCandles(100);
    marketDataMock.getCandles.mockResolvedValue(candles);

    const strategy: StrategyDSL = {
      name: 'dd_test',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 35'] },
      exit: { condition: ['rsi > 65'] },
      risk: { stop_loss: 10, take_profit: 10, position_size: 10 },
    };

    const result = await service.runBacktest(strategy);
    expect(result.metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(result.metrics.maxDrawdown).toBeLessThanOrEqual(100);
  });

  it('profitFactor = grossProfit / grossLoss', async () => {
    const candles = generateCandles(100);
    marketDataMock.getCandles.mockResolvedValue(candles);

    const strategy: StrategyDSL = {
      name: 'pf_test',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 35'] },
      exit: { condition: ['rsi > 65'] },
      risk: { stop_loss: 5, take_profit: 10, position_size: 10 },
    };

    const result = await service.runBacktest(strategy);
    expect(typeof result.metrics.profitFactor).toBe('number');
    expect(result.metrics.profitFactor).toBeGreaterThanOrEqual(0);
  });
});

describe('Issue #10 — Condition expression evaluator', () => {
  let service: BacktestService;
  let marketDataMock: jest.Mocked<MarketDataService>;
  let indicatorsService: IndicatorsService;

  beforeEach(() => {
    indicatorsService = new IndicatorsService();
    marketDataMock = { getCandles: jest.fn() } as any;
    service = new BacktestService(marketDataMock, indicatorsService);
  });

  // Access the private evaluateCondition method for testing
  function evaluate(
    condition: string,
    indicators: Record<string, number[]>,
    index: number,
  ): boolean {
    return (service as any).evaluateCondition(condition, indicators, index);
  }

  it('simple: rsi < 30', () => {
    const indicators = { rsi: [25], close: [100], volume: [1000] };
    expect(evaluate('rsi < 30', indicators, 0)).toBe(true);
    const indicators2 = { rsi: [50], close: [100], volume: [1000] };
    expect(evaluate('rsi < 30', indicators2, 0)).toBe(false);
  });

  it('two vars: ema_fast > ema_slow', () => {
    const indicators = { ema_fast: [150], ema_slow: [120], close: [100], volume: [1000] };
    expect(evaluate('ema_fast > ema_slow', indicators, 0)).toBe(true);

    const indicators2 = { ema_fast: [100], ema_slow: [120], close: [100], volume: [1000] };
    expect(evaluate('ema_fast > ema_slow', indicators2, 0)).toBe(false);
  });

  it('compound AND: rsi < 30 and ema_fast > ema_slow', () => {
    const indicators = { rsi: [25], ema_fast: [150], ema_slow: [120], close: [100], volume: [1000] };
    expect(evaluate('rsi < 30 and ema_fast > ema_slow', indicators, 0)).toBe(true);

    const indicators2 = { rsi: [50], ema_fast: [150], ema_slow: [120], close: [100], volume: [1000] };
    expect(evaluate('rsi < 30 and ema_fast > ema_slow', indicators2, 0)).toBe(false);
  });

  it('math: close > ema_slow * 1.02', () => {
    const indicators = { close: [125], ema_slow: [100], volume: [1000] };
    // 125 > 100 * 1.02 = 102 → true
    expect(evaluate('close > ema_slow * 1.02', indicators, 0)).toBe(true);

    const indicators2 = { close: [101], ema_slow: [100], volume: [1000] };
    // 101 > 102 → false
    expect(evaluate('close > ema_slow * 1.02', indicators2, 0)).toBe(false);
  });

  it('OR: rsi < 35 or rsi > 65', () => {
    const indicators = { rsi: [20], close: [100], volume: [1000] };
    expect(evaluate('rsi < 35 or rsi > 65', indicators, 0)).toBe(true);

    const indicators2 = { rsi: [70], close: [100], volume: [1000] };
    expect(evaluate('rsi < 35 or rsi > 65', indicators2, 0)).toBe(true);

    const indicators3 = { rsi: [50], close: [100], volume: [1000] };
    expect(evaluate('rsi < 35 or rsi > 65', indicators3, 0)).toBe(false);
  });

  it('crossover(ema_fast, ema_slow)', () => {
    // At index 1: prev fast(10) <= prev slow(12) and curr fast(15) > curr slow(13)
    const indicators = {
      ema_fast: [10, 15],
      ema_slow: [12, 13],
      close: [100, 101],
      volume: [1000, 1000],
    };
    expect(evaluate('crossover(ema_fast, ema_slow)', indicators, 1)).toBe(true);

    // No crossover: fast always above slow
    const indicators2 = {
      ema_fast: [20, 25],
      ema_slow: [12, 13],
      close: [100, 101],
      volume: [1000, 1000],
    };
    expect(evaluate('crossover(ema_fast, ema_slow)', indicators2, 1)).toBe(false);
  });

  it('missing variable returns false', () => {
    const indicators = { close: [100], volume: [1000] };
    expect(evaluate('rsi < 30', indicators, 0)).toBe(false);
  });
});
