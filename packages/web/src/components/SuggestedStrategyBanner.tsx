import { StrategyDSL } from '@ai-trading/shared';

interface SuggestedStrategyBannerProps {
  strategy: StrategyDSL;
  onApply: () => void;
  onDismiss: () => void;
}

export default function SuggestedStrategyBanner({
  strategy,
  onApply,
  onDismiss,
}: SuggestedStrategyBannerProps) {
  return (
    <div className="mx-4 mb-3 rounded-lg border border-primary-500/30 bg-primary-500/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary-400 mb-0.5">
            ✨ AI suggests a new strategy
          </p>
          <p className="text-xs text-gray-300 font-mono truncate">
            {strategy.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {strategy.market.symbol} · {strategy.market.timeframe} · SL {strategy.risk.stop_loss}% · TP {strategy.risk.take_profit}%
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={onApply}
            className="text-xs px-3 py-1 rounded bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors"
          >
            Apply &amp; Run
          </button>
        </div>
      </div>
    </div>
  );
}
