import {
  StrategyDSL,
  ExecutionParams,
  Trade,
  BacktestMetrics,
  BacktestResult,
  OHLCVCandle,
} from './index';

// These tests verify that types are correctly structured and exported.
// They use Object.keys() and property checks that would fail if fields are renamed or removed.

describe('Issue #1 — Strategy DSL TypeScript types', () => {
  it('StrategyDSL requires name, market, indicator, entry, exit, risk', () => {
    // TypeScript will catch missing fields at compile time,
    // but we also verify runtime shape is correct
    const strategy: StrategyDSL = {
      name: 'test_strategy',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14, ema_fast: 20, ema_slow: 200 },
      entry: { condition: ['rsi < 30'] },
      exit: { condition: ['rsi > 70'] },
      risk: { stop_loss: 3, take_profit: 8, position_size: 10 },
    };

    // Verify nested structure — these would fail if type shape changed
    expect(Object.keys(strategy.market)).toEqual(expect.arrayContaining(['exchange', 'symbol', 'timeframe']));
    expect(Object.keys(strategy.risk)).toEqual(expect.arrayContaining(['stop_loss', 'take_profit', 'position_size']));
    expect(Array.isArray(strategy.entry.condition)).toBe(true);
    expect(Array.isArray(strategy.exit.condition)).toBe(true);
  });

  it('StrategyDSL optional fields are truly optional (no runtime error when omitted)', () => {
    // This would throw at runtime if execution/startDate/endDate were required
    const minimal: StrategyDSL = {
      name: 'minimal',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 30'] },
      exit: { condition: ['rsi > 70'] },
      risk: { stop_loss: 3, take_profit: 8, position_size: 10 },
    };

    expect(minimal.execution).toBeUndefined();
    expect(minimal.startDate).toBeUndefined();
    expect(minimal.endDate).toBeUndefined();
  });

  it('ExecutionParams has commission, slippage, leverage with correct types', () => {
    const params: ExecutionParams = { commission: 0.001, slippage: 0.0005, leverage: 3 };

    expect(Object.keys(params)).toHaveLength(3);
    expect(typeof params.commission).toBe('number');
    expect(typeof params.slippage).toBe('number');
    expect(typeof params.leverage).toBe('number');
  });

  it('Trade has all required fields including isWin boolean', () => {
    const winTrade: Trade = {
      id: 1, entryTime: '2024-01-01T00:00:00Z', entryPrice: 42000,
      exitTime: '2024-01-02T00:00:00Z', exitPrice: 43000,
      side: 'long', pnl: 238.1, pnlPercent: '+2.38%', fees: 20, isWin: true,
    };
    const lossTrade: Trade = { ...winTrade, id: 2, pnl: -100, isWin: false };

    expect(winTrade.isWin).toBe(true);
    expect(lossTrade.isWin).toBe(false);
    expect(typeof winTrade.pnl).toBe('number');
    expect(typeof winTrade.fees).toBe('number');
    // side must be 'long' or 'short'
    expect(['long', 'short']).toContain(winTrade.side);
  });

  it('BacktestMetrics has exactly 7 fields', () => {
    const metrics: BacktestMetrics = {
      totalTrades: 10, winRate: 60, totalReturn: 15.5,
      maxDrawdown: 8.2, sharpeRatio: 1.5, profitFactor: 2.1, totalFees: 50,
    };

    expect(Object.keys(metrics)).toHaveLength(7);
    // All values must be numbers
    for (const val of Object.values(metrics)) {
      expect(typeof val).toBe('number');
    }
  });

  it('OHLCVCandle has exactly 6 fields all numeric', () => {
    const candle: OHLCVCandle = {
      timestamp: 1704067200000, open: 42000, high: 43000,
      low: 41500, close: 42800, volume: 1234.56,
    };

    expect(Object.keys(candle)).toHaveLength(6);
    for (const val of Object.values(candle)) {
      expect(typeof val).toBe('number');
    }
    // high must be >= low
    expect(candle.high).toBeGreaterThanOrEqual(candle.low);
  });

  it('BacktestResult correctly composes strategy, trades, and metrics', () => {
    const result: BacktestResult = {
      strategy: {
        name: 'test', market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
        indicator: { rsi: 14 }, entry: { condition: ['rsi < 30'] },
        exit: { condition: ['rsi > 70'] }, risk: { stop_loss: 3, take_profit: 8, position_size: 10 },
      },
      trades: [],
      metrics: {
        totalTrades: 0, winRate: 0, totalReturn: 0,
        maxDrawdown: 0, sharpeRatio: 0, profitFactor: 0, totalFees: 0,
      },
    };

    expect(result.trades).toEqual([]);
    expect(result.metrics.totalTrades).toBe(0);
    // strategy reference must be intact
    expect(result.strategy.name).toBe('test');
  });

  it('all types exported from @ai-trading/shared index (verified via object construction)', () => {
    // TypeScript interfaces have no runtime value, but we verify the module
    // is importable and that objects conforming to these types can be constructed
    // without errors — if a field is removed from the type, TS will catch it at compile time
    const shared = require('./index');
    expect(shared).toBeDefined();
    expect(shared.greeting).toBe('Hello from shared package');

    // Verify we can construct objects matching each type without runtime errors
    const candle: OHLCVCandle = { timestamp: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 };
    const params: ExecutionParams = { commission: 0, slippage: 0, leverage: 1 };
    const trade: Trade = {
      id: 1, entryTime: '', entryPrice: 0, exitTime: '', exitPrice: 0,
      side: 'long', pnl: 0, pnlPercent: '0%', fees: 0, isWin: false,
    };
    const metrics: BacktestMetrics = {
      totalTrades: 0, winRate: 0, totalReturn: 0,
      maxDrawdown: 0, sharpeRatio: 0, profitFactor: 0, totalFees: 0,
    };
    const result: BacktestResult = {
      strategy: {
        name: 'x', market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
        indicator: {}, entry: { condition: [] }, exit: { condition: [] },
        risk: { stop_loss: 0, take_profit: 0, position_size: 0 },
      },
      trades: [trade],
      metrics,
    };

    expect(candle).toBeDefined();
    expect(params).toBeDefined();
    expect(result.trades).toHaveLength(1);
  });
});
