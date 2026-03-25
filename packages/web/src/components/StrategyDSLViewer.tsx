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

      {/* Conditions — compact badge + inline */}
      <div className="space-y-1.5 mb-4">
        {/* LONG row */}
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 text-xs font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded w-14 text-center">LONG</span>
          <p className="text-xs text-gray-300 font-mono truncate">
            {strategy.entry.condition.length > 0
              ? strategy.entry.condition.map((c, i) => (
                  <span key={i}><span className="text-green-500">▲</span>{c}{i < strategy.entry.condition.length - 1 ? ' & ' : ''}</span>
                ))
              : <span className="text-gray-600">—</span>}
            {strategy.entry.condition.length > 0 && strategy.exit.condition.length > 0 && (
              <span className="text-gray-600 mx-2">·</span>
            )}
            {strategy.exit.condition.length > 0
              ? strategy.exit.condition.map((c, i) => (
                  <span key={i}><span className="text-red-500">▼</span>{c}{i < strategy.exit.condition.length - 1 ? ' & ' : ''}</span>
                ))
              : null}
          </p>
        </div>

        {/* SHORT row — only show if short conditions exist */}
        {strategy.entry.short_condition?.length ? (
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 text-xs font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded w-14 text-center">SHORT</span>
            <p className="text-xs text-gray-300 font-mono truncate">
              {strategy.entry.short_condition.map((c, i) => (
                <span key={i}><span className="text-orange-500">▲</span>{c}{i < (strategy.entry.short_condition?.length ?? 0) - 1 ? ' & ' : ''}</span>
              ))}
              {strategy.exit.short_condition?.length && (
                <><span className="text-gray-600 mx-2">·</span>{strategy.exit.short_condition.map((c, i) => (
                  <span key={i}><span className="text-orange-400">▼</span>{c}</span>
                ))}</>
              )}
            </p>
          </div>
        ) : null}
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
