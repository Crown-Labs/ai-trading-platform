import {
  StrategyDSL,
  ExecutionParams,
  BacktestResult,
  Trade,
  BacktestMetrics,
  OHLCVCandle,
} from './strategy.types';

describe('Issue #1 — Strategy DSL TypeScript types', () => {
  describe('StrategyDSL interface', () => {
    it('should have all required fields: name, market, indicator, entry, exit, risk', () => {
      const strategy: StrategyDSL = {
        name: 'test_strategy',
        market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
        indicator: { rsi: 14 },
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

    it('should support optional execution field', () => {
      const strategy: StrategyDSL = {
        name: 'with_execution',
        market: { exchange: 'binance', symbol: 'ETHUSDT', timeframe: '4h' },
        indicator: { ema_fast: 20, ema_slow: 50 },
        entry: { condition: ['ema_fast > ema_slow'] },
        exit: { condition: ['ema_fast < ema_slow'] },
        risk: { stop_loss: 2, take_profit: 6, position_size: 5 },
        execution: { commission: 0.001, slippage: 0.0005, leverage: 2 },
      };
      expect(strategy.execution).toBeDefined();
      expect(strategy.execution!.commission).toBe(0.001);
      expect(strategy.execution!.slippage).toBe(0.0005);
      expect(strategy.execution!.leverage).toBe(2);
    });

    it('should support optional startDate and endDate fields', () => {
      const strategy: StrategyDSL = {
        name: 'with_dates',
        market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1d' },
        indicator: { sma: 50 },
        entry: { condition: ['close > sma'] },
        exit: { condition: ['close < sma'] },
        risk: { stop_loss: 5, take_profit: 10, position_size: 20 },
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };
      expect(strategy.startDate).toBe('2025-01-01');
      expect(strategy.endDate).toBe('2025-12-31');
    });

    it('should work without optional fields', () => {
      const strategy: StrategyDSL = {
        name: 'minimal',
        market: { exchange: 'binance', symbol: 'SOLUSDT', timeframe: '15m' },
        indicator: {},
        entry: { condition: [] },
        exit: { condition: [] },
        risk: { stop_loss: 1, take_profit: 2, position_size: 5 },
      };
      expect(strategy.execution).toBeUndefined();
      expect(strategy.startDate).toBeUndefined();
      expect(strategy.endDate).toBeUndefined();
    });

    it('should support all indicator types', () => {
      const strategy: StrategyDSL = {
        name: 'all_indicators',
        market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
        indicator: {
          rsi: 14,
          ema_fast: 12,
          ema_slow: 26,
          sma: 50,
          macd: { fast: 12, slow: 26, signal: 9 },
          bbands: { period: 20, stddev: 2 },
          stoch: { kPeriod: 14, dPeriod: 3 },
          atr: 14,
          adx: 14,
        },
        entry: { condition: ['rsi < 30'] },
        exit: { condition: ['rsi > 70'] },
        risk: { stop_loss: 3, take_profit: 8, position_size: 10 },
      };
      expect(strategy.indicator.macd!.fast).toBe(12);
      expect(strategy.indicator.bbands!.period).toBe(20);
      expect(strategy.indicator.stoch!.kPeriod).toBe(14);
      expect(strategy.indicator.atr).toBe(14);
      expect(strategy.indicator.adx).toBe(14);
    });
  });

  describe('Trade interface', () => {
    it('should have all required fields', () => {
      const trade: Trade = {
        id: 1,
        entryTime: '2025-01-01T00:00:00Z',
        entryPrice: 42000,
        exitTime: '2025-01-02T00:00:00Z',
        exitPrice: 43000,
        side: 'long',
        pnl: 238.10,
        pnlPercent: '+2.38%',
        fees: 2.00,
        isWin: true,
      };
      expect(trade.id).toBe(1);
      expect(trade.entryTime).toBe('2025-01-01T00:00:00Z');
      expect(trade.entryPrice).toBe(42000);
      expect(trade.exitTime).toBe('2025-01-02T00:00:00Z');
      expect(trade.exitPrice).toBe(43000);
      expect(trade.side).toBe('long');
      expect(trade.pnl).toBe(238.10);
      expect(trade.pnlPercent).toBe('+2.38%');
      expect(trade.fees).toBe(2.00);
      expect(trade.isWin).toBe(true);
    });

    it('should support short side', () => {
      const trade: Trade = {
        id: 2,
        entryTime: '2025-02-01T00:00:00Z',
        entryPrice: 45000,
        exitTime: '2025-02-02T00:00:00Z',
        exitPrice: 44000,
        side: 'short',
        pnl: -100,
        pnlPercent: '\u22121.00%',
        fees: 1.50,
        isWin: false,
      };
      expect(trade.side).toBe('short');
      expect(trade.isWin).toBe(false);
    });
  });

  describe('BacktestMetrics interface', () => {
    it('should have all required fields', () => {
      const metrics: BacktestMetrics = {
        totalTrades: 50,
        winRate: 60,
        totalReturn: 15.5,
        maxDrawdown: 8.3,
        sharpeRatio: 1.5,
        profitFactor: 2.1,
        totalFees: 25.0,
      };
      expect(metrics.totalTrades).toBe(50);
      expect(metrics.winRate).toBe(60);
      expect(metrics.totalReturn).toBe(15.5);
      expect(metrics.maxDrawdown).toBe(8.3);
      expect(metrics.sharpeRatio).toBe(1.5);
      expect(metrics.profitFactor).toBe(2.1);
      expect(metrics.totalFees).toBe(25.0);
    });
  });

  describe('BacktestResult interface', () => {
    it('should have strategy, trades, and metrics', () => {
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
      expect(result.strategy).toBeDefined();
      expect(result.trades).toEqual([]);
      expect(result.metrics).toBeDefined();
    });
  });

  describe('OHLCVCandle interface', () => {
    it('should have timestamp, open, high, low, close, volume', () => {
      const candle: OHLCVCandle = {
        timestamp: 1704067200000,
        open: 42000,
        high: 43500,
        low: 41500,
        close: 43000,
        volume: 1500.5,
      };
      expect(candle.timestamp).toBe(1704067200000);
      expect(candle.open).toBe(42000);
      expect(candle.high).toBe(43500);
      expect(candle.low).toBe(41500);
      expect(candle.close).toBe(43000);
      expect(candle.volume).toBe(1500.5);
    });
  });

  describe('ExecutionParams interface', () => {
    it('should have commission, slippage, leverage', () => {
      const params: ExecutionParams = {
        commission: 0.001,
        slippage: 0.0005,
        leverage: 3,
      };
      expect(params.commission).toBe(0.001);
      expect(params.slippage).toBe(0.0005);
      expect(params.leverage).toBe(3);
    });
  });

  describe('Exports from index.ts', () => {
    it('should re-export all types from @ai-trading/shared index', () => {
      const index = require('./index');
      expect(index).toBeDefined();
      // The index re-exports from strategy.types via `export * from './strategy.types'`
      // Since these are interfaces (type-only), they are erased at runtime.
      // We verify the module loads without error, confirming the export path works.
      expect(index.greeting).toBe('Hello from shared package');
    });
  });
});
