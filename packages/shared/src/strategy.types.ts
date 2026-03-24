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
}

export interface Trade {
  id: number;
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  side: 'long' | 'short';
  profit: number;
  profitPercent: number;
  isWin: boolean;
}

export interface BacktestMetrics {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
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
