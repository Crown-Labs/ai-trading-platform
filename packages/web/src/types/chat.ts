import { StrategyDSL, BacktestResult, BacktestRun, OHLCVCandle } from '@ai-trading/shared';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
  strategy?: StrategyDSL;           // active strategy (used for backtest)
  suggestedStrategy?: StrategyDSL;  // AI-suggested, pending user approval
  backtestResult?: BacktestResult;
  candles?: OHLCVCandle[];
  backtestRuns?: BacktestRun[];
  activeRunId?: string;
}
