import {
  StrategyDSL,
  ExecutionParams,
  Trade,
  BacktestMetrics,
  BacktestResult,
  OHLCVCandle,
} from './index';

describe('Issue #1 — Strategy DSL TypeScript types', () => {
  it('StrategyDSL has all required fields', () => {
    const strategy: StrategyDSL = {
      name: 'test_strategy',
      market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
      indicator: { rsi: 14, ema_fast: 20, ema_slow: 200 },
      entry: { condition: ['rsi < 30'] },
      exit: { condition: ['rsi > 70'] },
      risk: { stop_loss: 3, take_profit: 8, position_size: 10 },
    };

    expect(strategy.name).toBe('test_strategy');
    expect(strategy.market.exchange).toBe('binance');
    expect(strategy.market.symbol).toBe('BTCUSDT');
    expect(strategy.market.timeframe).toBe('1h');
    expect(strategy.indicator.rsi).toBe(14);
    expect(strategy.entry.condition).toEqual(['rsi < 30']);
    expect(strategy.exit.condition).toEqual(['rsi > 70']);
    expect(strategy.risk.stop_loss).toBe(3);
    expect(strategy.risk.take_profit).toBe(8);
    expect(strategy.risk.position_size).toBe(10);
  });

  it('StrategyDSL supports optional execution, startDate, endDate', () => {
    const strategy: StrategyDSL = {
      name: 'full_strategy',
      market: { exchange: 'binance', symbol: 'ETHUSDT', timeframe: '4h' },
      indicator: { rsi: 14 },
      entry: { condition: ['rsi < 25'] },
      exit: { condition: ['rsi > 75'] },
      risk: { stop_loss: 2, take_profit: 5, position_size: 20 },
      execution: { commission: 0.001, slippage: 0.0005, leverage: 2 },
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };

    expect(strategy.execution!.commission).toBe(0.001);
    expect(strategy.execution!.slippage).toBe(0.0005);
    expect(strategy.execution!.leverage).toBe(2);
    expect(strategy.startDate).toBe('2024-01-01');
    expect(strategy.endDate).toBe('2024-12-31');
  });

  it('ExecutionParams has commission, slippage, leverage', () => {
    const params: ExecutionParams = {
      commission: 0.001,
      slippage: 0.0005,
      leverage: 3,
    };

    expect(params).toHaveProperty('commission');
    expect(params).toHaveProperty('slippage');
    expect(params).toHaveProperty('leverage');
    expect(typeof params.commission).toBe('number');
    expect(typeof params.slippage).toBe('number');
    expect(typeof params.leverage).toBe('number');
  });

  it('Trade has all fields including isWin', () => {
    const trade: Trade = {
      id: 1,
      entryTime: '2024-01-01T00:00:00Z',
      entryPrice: 42000,
      exitTime: '2024-01-02T00:00:00Z',
      exitPrice: 43000,
      side: 'long',
      pnl: 238.1,
      pnlPercent: '+2.38%',
      fees: 20,
      isWin: true,
    };

    expect(trade.id).toBe(1);
    expect(trade.entryTime).toBeDefined();
    expect(trade.entryPrice).toBe(42000);
    expect(trade.exitTime).toBeDefined();
    expect(trade.exitPrice).toBe(43000);
    expect(trade.side).toBe('long');
    expect(trade.pnl).toBe(238.1);
    expect(trade.pnlPercent).toBe('+2.38%');
    expect(trade.fees).toBe(20);
    expect(trade.isWin).toBe(true);
  });

  it('BacktestMetrics has all 7 fields', () => {
    const metrics: BacktestMetrics = {
      totalTrades: 10,
      winRate: 60,
      totalReturn: 15.5,
      maxDrawdown: 8.2,
      sharpeRatio: 1.5,
      profitFactor: 2.1,
      totalFees: 50,
    };

    const keys = Object.keys(metrics);
    expect(keys).toHaveLength(7);
    expect(keys).toContain('totalTrades');
    expect(keys).toContain('winRate');
    expect(keys).toContain('totalReturn');
    expect(keys).toContain('maxDrawdown');
    expect(keys).toContain('sharpeRatio');
    expect(keys).toContain('profitFactor');
    expect(keys).toContain('totalFees');
  });

  it('OHLCVCandle has 6 fields', () => {
    const candle: OHLCVCandle = {
      timestamp: 1704067200000,
      open: 42000,
      high: 43000,
      low: 41500,
      close: 42800,
      volume: 1234.56,
    };

    const keys = Object.keys(candle);
    expect(keys).toHaveLength(6);
    expect(keys).toContain('timestamp');
    expect(keys).toContain('open');
    expect(keys).toContain('high');
    expect(keys).toContain('low');
    expect(keys).toContain('close');
    expect(keys).toContain('volume');
  });

  it('BacktestResult contains strategy, trades, and metrics', () => {
    const result: BacktestResult = {
      strategy: {
        name: 'test',
        market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
        indicator: { rsi: 14 },
        entry: { condition: ['rsi < 30'] },
        exit: { condition: ['rsi > 70'] },
        risk: { stop_loss: 3, take_profit: 8, position_size: 10 },
      },
      trades: [],
      metrics: {
        totalTrades: 0,
        winRate: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        profitFactor: 0,
        totalFees: 0,
      },
    };

    expect(result).toHaveProperty('strategy');
    expect(result).toHaveProperty('trades');
    expect(result).toHaveProperty('metrics');
  });

  it('all types exported from @ai-trading/shared index', () => {
    // If these imports compiled without error, the types are exported correctly.
    // Verify by creating instances of each type — compilation success = export success.
    const candle: OHLCVCandle = { timestamp: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 };
    const params: ExecutionParams = { commission: 0, slippage: 0, leverage: 1 };
    const trade: Trade = {
      id: 1, entryTime: '', entryPrice: 0, exitTime: '', exitPrice: 0,
      side: 'long', pnl: 0, pnlPercent: '0%', fees: 0, isWin: false,
    };
    const metrics: BacktestMetrics = {
      totalTrades: 0, winRate: 0, totalReturn: 0, maxDrawdown: 0,
      sharpeRatio: 0, profitFactor: 0, totalFees: 0,
    };
    expect(candle).toBeDefined();
    expect(params).toBeDefined();
    expect(trade).toBeDefined();
    expect(metrics).toBeDefined();
  });
});
