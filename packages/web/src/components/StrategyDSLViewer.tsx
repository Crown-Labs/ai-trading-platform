import { useState } from 'react';
import { StrategyDSL } from '@ai-trading/shared';
import YAML from 'yaml';

interface StrategyDSLViewerProps {
  strategy: StrategyDSL;
}

export default function StrategyDSLViewer({ strategy }: StrategyDSLViewerProps) {
  const [copied, setCopied] = useState(false);

  const indicators = [
    strategy.indicator?.rsi != null && `RSI(${strategy.indicator.rsi})`,
    strategy.indicator?.ema_fast != null && `EMA(${strategy.indicator.ema_fast})`,
    strategy.indicator?.ema_slow != null && `EMA(${strategy.indicator.ema_slow})`,
  ].filter(Boolean) as string[];

  const handleCopy = () => {
    const yaml = YAML.stringify({
      strategy: { name: strategy.name },
      market: strategy.market,
      indicator: strategy.indicator,
      entry: strategy.entry,
      exit: strategy.exit,
      risk: strategy.risk,
      ...(strategy.execution && { execution: strategy.execution }),
    });
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">Strategy DSL</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>&#10003; <span>Copied</span></>
          ) : (
            <>&#9112; <span>Copy</span></>
          )}
        </button>
      </div>

      {/* Strategy Name */}
      <h3 className="text-white font-semibold text-base mb-3">{strategy.name}</h3>

      {/* Market + Indicators row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white font-medium">{strategy.market.symbol}</p>
          <p className="text-gray-500 text-xs mt-0.5">{strategy.market.exchange} &middot; {strategy.market.timeframe}</p>
        </div>
        <div className="flex flex-wrap gap-1 justify-end max-w-[55%]">
          {indicators.map((ind) => (
            <span key={ind} className="text-xs bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded-full border border-primary-500/20">
              {ind}
            </span>
          ))}
        </div>
      </div>

      {/* Entry / Exit — always show all 4 cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Long Entry */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
          <p className="text-green-400 text-xs font-medium uppercase tracking-wider mb-2">
            Long Entry
          </p>
          <div className="space-y-1">
            {strategy.entry.condition.length > 0 ? strategy.entry.condition.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-gray-300 text-xs font-mono">{c}</span>
              </div>
            )) : <span className="text-gray-600 text-xs">—</span>}
          </div>
        </div>

        {/* Long Exit */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-xs font-medium uppercase tracking-wider mb-2">
            Long Exit
          </p>
          <div className="space-y-1">
            {strategy.exit.condition.length > 0 ? strategy.exit.condition.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-gray-300 text-xs font-mono">{c}</span>
              </div>
            )) : <span className="text-gray-600 text-xs">—</span>}
          </div>
        </div>

        {/* Short Entry */}
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
          <p className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-2">
            Short Entry
          </p>
          <div className="space-y-1">
            {strategy.entry.short_condition?.length ? strategy.entry.short_condition.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                <span className="text-gray-300 text-xs font-mono">{c}</span>
              </div>
            )) : <span className="text-gray-600 text-xs">—</span>}
          </div>
        </div>

        {/* Short Exit */}
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
          <p className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-2">
            Short Exit
          </p>
          <div className="space-y-1">
            {strategy.exit.short_condition?.length ? strategy.exit.short_condition.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                <span className="text-gray-300 text-xs font-mono">{c}</span>
              </div>
            )) : <span className="text-gray-600 text-xs">—</span>}
          </div>
        </div>
      </div>

      {/* Risk Parameters */}
      <div className="border-t border-dark-700 pt-3">
        <div className="grid grid-cols-5 gap-2 text-center">
          <div>
            <p className="text-gray-500 text-xs mb-1">SL</p>
            <p className="text-red-400 text-sm font-semibold">{strategy.risk.stop_loss}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">TP</p>
            <p className="text-green-400 text-sm font-semibold">{strategy.risk.take_profit}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Size</p>
            <p className="text-white text-sm font-semibold">{strategy.risk.position_size}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Leverage</p>
            <p className="text-white text-sm font-semibold">{strategy.execution?.leverage ?? 1}&times;</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Fee</p>
            <p className="text-white text-sm font-semibold">
              {strategy.execution?.commission != null
                ? `${(strategy.execution.commission * 100).toFixed(2)}%`
                : '0.10%'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
