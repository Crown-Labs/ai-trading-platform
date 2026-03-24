/**
 * Issue #3 — Trading UI types
 *
 * These are compile-time interface checks. If this file compiles, the types are correct.
 * We use runtime assertions to verify structural conformance.
 */
import type { ChatMessage, ChatSession } from './chat';

describe('Issue #3 — Chat types', () => {
  describe('ChatMessage interface', () => {
    it('should have role and content fields', () => {
      const msg: ChatMessage = {
        role: 'user',
        content: 'Create a BTC RSI strategy',
      };
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Create a BTC RSI strategy');
    });

    it('should support assistant role', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: 'Here is your strategy...',
      };
      expect(msg.role).toBe('assistant');
    });
  });

  describe('ChatSession interface', () => {
    it('should have id, title, createdAt, messages fields', () => {
      const session: ChatSession = {
        id: 'abc-123',
        title: 'BTC Strategy',
        createdAt: '2025-01-01T00:00:00Z',
        messages: [{ role: 'user', content: 'hello' }],
      };
      expect(session.id).toBe('abc-123');
      expect(session.title).toBe('BTC Strategy');
      expect(session.createdAt).toBe('2025-01-01T00:00:00Z');
      expect(session.messages).toHaveLength(1);
    });

    it('should support optional strategy, backtestResult, and candles', () => {
      const session: ChatSession = {
        id: 'abc-456',
        title: 'Test',
        createdAt: '2025-01-01T00:00:00Z',
        messages: [],
        strategy: {
          name: 'test',
          market: { exchange: 'binance', symbol: 'BTCUSDT', timeframe: '1h' },
          indicator: { rsi: 14 },
          entry: { condition: ['rsi < 30'] },
          exit: { condition: ['rsi > 70'] },
          risk: { stop_loss: 3, take_profit: 8, position_size: 10 },
        },
        backtestResult: {
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
        },
        candles: [
          { timestamp: 1700000000000, open: 100, high: 110, low: 90, close: 105, volume: 50 },
        ],
      };
      expect(session.strategy).toBeDefined();
      expect(session.backtestResult).toBeDefined();
      expect(session.candles).toHaveLength(1);
    });

    it('should work without optional fields', () => {
      const session: ChatSession = {
        id: 'abc-789',
        title: 'Minimal',
        createdAt: '2025-01-01T00:00:00Z',
        messages: [],
      };
      expect(session.strategy).toBeUndefined();
      expect(session.backtestResult).toBeUndefined();
      expect(session.candles).toBeUndefined();
    });
  });
});
