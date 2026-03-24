import { useState } from 'react';
import { StrategyDSL, BacktestResult, OHLCVCandle } from '@ai-trading/shared';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import StrategyDSLViewer from './components/StrategyDSLViewer';
import BacktestStats from './components/BacktestStats';
import BacktestChart from './components/BacktestChart';
import TradeTable from './components/TradeTable';

function App() {
  const [strategy, setStrategy] = useState<StrategyDSL | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [backtestLoading, setBacktestLoading] = useState(false);

  const handleRunBacktest = async () => {
    if (!strategy || backtestLoading) return;
    setBacktestLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      });
      const data: BacktestResult = await res.json();
      setBacktestResult(data);

      // Fetch candles for chart
      const candleRes = await fetch(
        `http://localhost:4000/api/market-data/candles?symbol=${strategy.market.symbol}&interval=${strategy.market.timeframe}&limit=500`,
      );
      if (candleRes.ok) {
        setCandles(await candleRes.json());
      }
    } catch (err) {
      console.error('Backtest failed:', err);
    } finally {
      setBacktestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">
          AI Strategy
          <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            {' '}Backtester
          </span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1">
            <ChatPanel
              strategy={strategy}
              onStrategyParsed={setStrategy}
              onRunBacktest={handleRunBacktest}
            />
            {strategy && <StrategyDSLViewer strategy={strategy} />}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {backtestLoading && (
              <div className="card text-center py-12">
                <p className="text-gray-400">Running backtest...</p>
              </div>
            )}

            {backtestResult && !backtestLoading && (
              <>
                <BacktestStats metrics={backtestResult.metrics} />
                {candles.length > 0 && (
                  <BacktestChart
                    candles={candles}
                    trades={backtestResult.trades}
                  />
                )}
                <TradeTable trades={backtestResult.trades} />
              </>
            )}

            {!backtestResult && !backtestLoading && (
              <div className="card text-center py-20">
                <p className="text-gray-500 text-lg mb-2">No backtest results yet</p>
                <p className="text-gray-600 text-sm">
                  Describe a strategy in the chat panel, then click "Run Backtest"
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-dark-800 border-t border-dark-700">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-gray-400">
            &copy; 2026 AI Trading Platform. Built with React, TypeScript, Vite &amp; NestJS.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
