export interface ExecutionParams {
  commission: number;   // % as decimal e.g. 0.001 for 0.1%
  slippage: number;     // % as decimal e.g. 0.0005 for 0.05%
  leverage: number;     // 1 = spot, >1 = futures
}

export interface StrategyDSL {
  name: string;
  market: {
    exchange: string;
    symbol: string;
    timeframe: string;
  };
  indicator: {
    rsi?: number;
    ema_fast?: number;
    ema_slow?: number;
    sma?: number;
    macd?: { fast: number; slow: number; signal: number };
    bbands?: { period: number; stddev: number };
    stoch?: { kPeriod: number; dPeriod: number };
    atr?: number;
    adx?: number;
  };
  entry: {
    condition: string[];
  };
  exit: {
    condition: string[];
  };
  risk: {
    stop_loss: number;
    take_profit: number;
    position_size: number;
  };
  execution?: ExecutionParams;
  startDate?: string;
  endDate?: string;
}

export interface Trade {
  id: number;
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPercent: string;
  fees: number;
  isWin: boolean;
}

export interface BacktestMetrics {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  totalFees: number;
}

export interface BacktestResult {
  strategy: StrategyDSL;
  trades: Trade[];
  metrics: BacktestMetrics;
}

export interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
