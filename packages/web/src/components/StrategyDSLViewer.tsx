import { StrategyDSL } from '@ai-trading/shared';

interface StrategyDSLViewerProps {
  strategy: StrategyDSL;
}

export default function StrategyDSLViewer({ strategy }: StrategyDSLViewerProps) {
  const indicators = [
    strategy.indicator.rsi && `RSI(${strategy.indicator.rsi})`,
    strategy.indicator.ema_fast && `EMA Fast(${strategy.indicator.ema_fast})`,
    strategy.indicator.ema_slow && `EMA Slow(${strategy.indicator.ema_slow})`,
  ].filter(Boolean);

  return (
    <div className="card mt-4">
      <h2 className="text-lg font-bold text-white mb-4">Strategy DSL</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Name</span>
          <span className="text-white font-medium">{strategy.name}</span>
        </div>
        <div className="border-t border-dark-700" />
        <div className="flex justify-between">
          <span className="text-gray-400">Symbol</span>
          <span className="text-white">{strategy.market.symbol}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Exchange</span>
          <span className="text-white">{strategy.market.exchange}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Timeframe</span>
          <span className="text-white">{strategy.market.timeframe}</span>
        </div>
        <div className="border-t border-dark-700" />
        <div className="flex justify-between">
          <span className="text-gray-400">Indicators</span>
          <span className="text-white">{indicators.join(', ')}</span>
        </div>
        <div className="border-t border-dark-700" />
        <div>
          <span className="text-gray-400 block mb-1">Entry Conditions</span>
          {strategy.entry.condition.map((c, i) => (
            <span key={i} className="inline-block bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded mr-1 mb-1">
              {c}
            </span>
          ))}
        </div>
        <div>
          <span className="text-gray-400 block mb-1">Exit Conditions</span>
          {strategy.exit.condition.map((c, i) => (
            <span key={i} className="inline-block bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded mr-1 mb-1">
              {c}
            </span>
          ))}
        </div>
        <div className="border-t border-dark-700" />
        <div className="flex justify-between">
          <span className="text-gray-400">Stop Loss</span>
          <span className="text-red-400">{strategy.risk.stop_loss}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Take Profit</span>
          <span className="text-green-400">{strategy.risk.take_profit}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Position Size</span>
          <span className="text-white">{strategy.risk.position_size}</span>
        </div>
      </div>
    </div>
  );
}
