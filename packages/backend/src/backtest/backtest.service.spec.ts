import { BacktestService } from './backtest.service';
import { MarketDataService } from '../market-data/market-data.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { StrategyDSL, OHLCVCandle } from '@ai-trading/shared';

// Generates candles guaranteed to produce RSI < 30 (entry) then RSI > 70 (exit)
// Pattern: 30 drops of 5 → RSI goes to 0, then 30 rises of 6 → RSI goes to 90+
function createTradableCandles(startPrice = 200): OHLCVCandle[] {
  const prices: number[] = [];
  let p = startPrice;
  for (let i = 0; i < 30; i++) { p -= 5; prices.push(p); }
  for (let i = 0; i < 30; i++) { p += 6; prices.push(p); }
  return prices.map((close, i) => ({
    timestamp: 1704067200000 + i * 3600000,
    open: close - 1,
    high: close + 2,
    low: close - 2,
    close,
    volume: 1000,
  }));
}

const BASE_STRATEGY: StrategyDSL = {
  name: 'base',
  market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
  indicator: { rsi: 14 },
  entry: { condition: ['rsi < 30'] },
  exit: { condition: ['rsi > 70'] },
  risk: { stop_loss: 50, take_profit: 50, position_size: 100 },
};

describe('Issue #2 — Binance market data + Backtest engine', () => {
  let service: BacktestService;
  let marketDataMock: jest.Mocked<MarketDataService>;

  beforeEach(() => {
    marketDataMock = { getCandles: jest.fn() } as any;
    service = new BacktestService(marketDataMock, new IndicatorsService());
  });

  it('runBacktest returns BacktestResult with correct shape', async () => {
    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());

    const result = await service.runBacktest(BASE_STRATEGY);

    expect(result).toHaveProperty('strategy');
    expect(result).toHaveProperty('trades');
    expect(result).toHaveProperty('metrics');
    expect(result.strategy).toBe(BASE_STRATEGY);
    expect(Array.isArray(result.trades)).toBe(true);
    expect(result.metrics).toHaveProperty('totalTrades');
    expect(result.metrics).toHaveProperty('winRate');
    expect(result.metrics).toHaveProperty('totalReturn');
    expect(result.metrics).toHaveProperty('maxDrawdown');
    expect(result.metrics).toHaveProperty('sharpeRatio');
    expect(result.metrics).toHaveProperty('profitFactor');
    expect(result.metrics).toHaveProperty('totalFees');
  });

  it('RSI-based strategy produces at least one trade with tradable candles', async () => {
    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());

    const result = await service.runBacktest(BASE_STRATEGY);

    expect(result.trades.length).toBeGreaterThan(0);
    expect(result.metrics.totalTrades).toBeGreaterThan(0);
    expect(typeof result.metrics.winRate).toBe('number');
  });
});

describe('Issue #6 — Execution params', () => {
  let service: BacktestService;
  let marketDataMock: jest.Mocked<MarketDataService>;

  beforeEach(() => {
    marketDataMock = { getCandles: jest.fn() } as any;
    service = new BacktestService(marketDataMock, new IndicatorsService());
  });

  it('commission applied: fee = positionValue × commission × 2', async () => {
    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());

    const result = await service.runBacktest({
      ...BASE_STRATEGY,
      name: 'commission_test',
      execution: { commission: 0.01, slippage: 0, leverage: 1 },
    });

    // Guarantee at least one trade before asserting fee
    expect(result.trades.length).toBeGreaterThan(0);
    const trade = result.trades[0];
    // fee = INITIAL_CAPITAL(10000) × position_size(1.0) × leverage(1) × commission(0.01) × 2
    expect(trade.fees).toBe(200);
  });

  it('slippage reduces PnL compared to zero-slippage run', async () => {
    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());
    const resultNoSlip = await service.runBacktest({
      ...BASE_STRATEGY,
      name: 'no_slip',
      execution: { commission: 0, slippage: 0, leverage: 1 },
    });

    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());
    const resultSlip = await service.runBacktest({
      ...BASE_STRATEGY,
      name: 'with_slip',
      execution: { commission: 0, slippage: 0.01, leverage: 1 },
    });

    expect(resultNoSlip.trades.length).toBeGreaterThan(0);
    expect(resultSlip.trades.length).toBeGreaterThan(0);
    expect(resultSlip.trades[0].pnl).toBeLessThan(resultNoSlip.trades[0].pnl);
  });

  it('2x leverage produces ~2x PnL vs 1x leverage', async () => {
    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());
    const result1x = await service.runBacktest({
      ...BASE_STRATEGY,
      name: 'lev_1x',
      execution: { commission: 0, slippage: 0, leverage: 1 },
    });

    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());
    const result2x = await service.runBacktest({
      ...BASE_STRATEGY,
      name: 'lev_2x',
      execution: { commission: 0, slippage: 0, leverage: 2 },
    });

    expect(result1x.trades.length).toBeGreaterThan(0);
    expect(result2x.trades.length).toBeGreaterThan(0);
    expect(Math.abs(result2x.trades[0].pnl)).toBeCloseTo(
      Math.abs(result1x.trades[0].pnl) * 2,
      0,
    );
  });

  it('sharpeRatio is a finite number', async () => {
    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());

    const result = await service.runBacktest({ ...BASE_STRATEGY, name: 'sharpe_test' });

    expect(result.trades.length).toBeGreaterThan(0);
    expect(typeof result.metrics.sharpeRatio).toBe('number');
    expect(isFinite(result.metrics.sharpeRatio)).toBe(true);
  });

  it('maxDrawdown is between 0 and 100', async () => {
    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());

    const result = await service.runBacktest({ ...BASE_STRATEGY, name: 'dd_test' });

    expect(result.trades.length).toBeGreaterThan(0);
    expect(result.metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(result.metrics.maxDrawdown).toBeLessThanOrEqual(100);
  });

  it('profitFactor is a non-negative number', async () => {
    marketDataMock.getCandles.mockResolvedValue(createTradableCandles());

    const result = await service.runBacktest({ ...BASE_STRATEGY, name: 'pf_test' });

    expect(result.trades.length).toBeGreaterThan(0);
    expect(typeof result.metrics.profitFactor).toBe('number');
    expect(result.metrics.profitFactor).toBeGreaterThanOrEqual(0);
  });
});

describe('Issue #10 — Condition expression evaluator', () => {
  let service: BacktestService;

  beforeEach(() => {
    service = new BacktestService({ getCandles: jest.fn() } as any, new IndicatorsService());
  });

  function evaluate(condition: string, indicators: Record<string, number[]>, index: number): boolean {
    return (service as any).evaluateCondition(condition, indicators, index);
  }

  it('simple: rsi < 30', () => {
    expect(evaluate('rsi < 30', { rsi: [25] }, 0)).toBe(true);
    expect(evaluate('rsi < 30', { rsi: [50] }, 0)).toBe(false);
  });

  it('two vars: ema_fast > ema_slow', () => {
    expect(evaluate('ema_fast > ema_slow', { ema_fast: [150], ema_slow: [120] }, 0)).toBe(true);
    expect(evaluate('ema_fast > ema_slow', { ema_fast: [100], ema_slow: [120] }, 0)).toBe(false);
  });

  it('compound AND: rsi < 30 and ema_fast > ema_slow', () => {
    expect(evaluate('rsi < 30 and ema_fast > ema_slow', { rsi: [25], ema_fast: [150], ema_slow: [120] }, 0)).toBe(true);
    expect(evaluate('rsi < 30 and ema_fast > ema_slow', { rsi: [50], ema_fast: [150], ema_slow: [120] }, 0)).toBe(false);
  });

  it('math: close > ema_slow * 1.02', () => {
    expect(evaluate('close > ema_slow * 1.02', { close: [125], ema_slow: [100] }, 0)).toBe(true);
    expect(evaluate('close > ema_slow * 1.02', { close: [101], ema_slow: [100] }, 0)).toBe(false);
  });

  it('OR: rsi < 35 or rsi > 65', () => {
    expect(evaluate('rsi < 35 or rsi > 65', { rsi: [20] }, 0)).toBe(true);
    expect(evaluate('rsi < 35 or rsi > 65', { rsi: [70] }, 0)).toBe(true);
    expect(evaluate('rsi < 35 or rsi > 65', { rsi: [50] }, 0)).toBe(false);
  });

  it('crossover(ema_fast, ema_slow) detects upward cross', () => {
    // At index 1: prev fast(10) <= prev slow(12), curr fast(15) > curr slow(13) → crossover
    expect(evaluate('crossover(ema_fast, ema_slow)', { ema_fast: [10, 15], ema_slow: [12, 13] }, 1)).toBe(true);
    // fast always above slow → no crossover
    expect(evaluate('crossover(ema_fast, ema_slow)', { ema_fast: [20, 25], ema_slow: [12, 13] }, 1)).toBe(false);
  });

  it('missing variable returns false', () => {
    expect(evaluate('rsi < 30', { close: [100] }, 0)).toBe(false);
  });
});
