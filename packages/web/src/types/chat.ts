import { StrategyDSL, BacktestResult, OHLCVCandle } from '@ai-trading/shared';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
  strategy?: StrategyDSL;
  backtestResult?: BacktestResult;
  candles?: OHLCVCandle[];
}
