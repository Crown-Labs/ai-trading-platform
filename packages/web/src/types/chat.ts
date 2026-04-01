import { StrategyDSL, BacktestResult, BacktestRun, OHLCVCandle } from '@ai-trading/shared';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  strategy?: StrategyDSL; // attached strategy suggestion (assistant messages only)
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
  strategy?: StrategyDSL;           // active strategy (used for backtest)
  backtestResult?: BacktestResult;
  candles?: OHLCVCandle[];
  backtestRuns?: BacktestRun[];
  activeRunId?: string;
}
