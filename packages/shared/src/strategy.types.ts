export interface ExecutionParams {
  commission: number;   // % as decimal e.g. 0.001 for 0.1%
  slippage: number;     // % as decimal e.g. 0.0005 for 0.05%
  leverage: number;     // 1 = spot, >1 = futures
  execution_model?: 'next_bar' | 'same_bar';  // default: 'next_bar'
}

export interface StrategyDSL {
  name: string;
  market: {
    exchange: string;
    symbol: string;
    timeframe: string;
  };
  indicator: {
    // Original indicators
    rsi?: number;
    ema_fast?: number;
    ema_slow?: number;
    sma?: number;
    macd?: { fast: number; slow: number; signal: number };
    bbands?: { period: number; stddev: number };
    stoch?: { kPeriod: number; dPeriod: number };
    atr?: number;
    adx?: number;
    // New indicators
    cci?: number;
    wma?: number;
    vwap?: number;
    obv?: Record<string, never>; // OBV uses volume automatically
    roc?: number;
    stochrsi?: number;
    dema?: number;
    tema?: number;
    hma?: number;
    willr?: number;
    mfi?: number;
    kc?: { period: number; multiple: number };
    aroon?: number;
    psar?: { step: number; max: number };
    cmf?: number;
    // Allow any other indicators dynamically
    [key: string]: any;
  };
  entry: {
    condition: string[];
    short_condition?: string[];
  };
  exit: {
    condition: string[];
    short_condition?: string[];
  };
  risk: {
    stop_loss: number;
    take_profit: number;
    position_size: number;
  };
  execution?: ExecutionParams;
  startDate?: string;
  endDate?: string;
  initialCapital?: number; // default: 10000
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

export interface BacktestDataRange {
  requestedStart: string;   // ISO date from strategy.startDate
  requestedEnd: string;     // ISO date from strategy.endDate
  actualStart: string;      // ISO date of first candle
  actualEnd: string;        // ISO date of last candle
  totalCandles: number;
  requestedDays: number;
  actualDays: number;
  isComplete: boolean;      // true if actual >= requested
}

export interface BacktestResult {
  strategy: StrategyDSL;
  trades: Trade[];
  metrics: BacktestMetrics;
  dataRange?: BacktestDataRange;
}

export interface BacktestRun {
  id: string;
  version: number;
  strategyName: string;
  startDate: string;
  endDate: string;
  strategy: StrategyDSL;
  result: BacktestResult;
  createdAt: string;
}

export interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
