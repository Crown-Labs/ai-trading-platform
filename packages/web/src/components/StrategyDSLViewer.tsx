import { useState, useRef, useEffect } from 'react';
import { StrategyDSL } from '@ai-trading/shared';
import YAML from 'yaml';
import { generatePineScript } from '../utils/pine-script-generator';

interface StrategyDSLViewerProps {
  strategy: StrategyDSL;
}

export default function StrategyDSLViewer({ strategy }: StrategyDSLViewerProps) {
  const [copied, setCopied] = useState<'yaml' | 'pine' | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const ind = strategy.indicator ?? {};
  const indicators = [
    // Trend — Moving Averages
    ind.ema_fast != null && `EMA_F(${ind.ema_fast})`,
    ind.ema_slow != null && `EMA_S(${ind.ema_slow})`,
    ind.sma != null && `SMA(${ind.sma})`,
    ind.wma != null && `WMA(${ind.wma})`,
    ind.dema != null && `DEMA(${ind.dema})`,
    ind.tema != null && `TEMA(${ind.tema})`,
    ind.hma != null && `HMA(${ind.hma})`,
    // Momentum
    ind.rsi != null && `RSI(${ind.rsi})`,
    ind.macd != null && `MACD(${(ind.macd as any).fast ?? 12},${(ind.macd as any).slow ?? 26},${(ind.macd as any).signal ?? 9})`,
    ind.cci != null && `CCI(${ind.cci})`,
    ind.roc != null && `ROC(${ind.roc})`,
    ind.stochrsi != null && `StochRSI(${ind.stochrsi})`,
    ind.willr != null && `WillR(${ind.willr})`,
    ind.stoch != null && `STOCH(${(ind.stoch as any).kPeriod ?? 14})`,
    // Volatility
    ind.atr != null && `ATR(${ind.atr})`,
    ind.bbands != null && `BB(${(ind.bbands as any).period ?? 20},${(ind.bbands as any).stddev ?? 2})`,
    ind.kc != null && `KC(${(ind.kc as any).period ?? 20})`,
    // Trend
    ind.adx != null && `ADX(${ind.adx})`,
    ind.aroon != null && `Aroon(${ind.aroon})`,
    ind.psar != null && `PSAR(${(ind.psar as any).step ?? 0.02})`,
    // Volume
    ind.vwap != null && `VWAP`,
    ind.obv != null && `OBV`,
    ind.mfi != null && `MFI(${ind.mfi})`,
    ind.cmf != null && `CMF(${ind.cmf})`,
  ].filter(Boolean) as string[];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyYAML = () => {
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
    setCopied('yaml');
    setDropdownOpen(false);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyPine = () => {
    const pine = generatePineScript(strategy);
    navigator.clipboard.writeText(pine);
    setCopied('pine');
    setDropdownOpen(false);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">Strategy DSL</span>
        </div>

        {/* Copy dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
          >
            {copied === 'yaml' ? (
              <>&#10003; <span>YAML Copied</span></>
            ) : copied === 'pine' ? (
              <>&#10003; <span>Pine Copied</span></>
            ) : (
              <><span>&#9112; Copy</span> <span className="text-gray-600">▾</span></>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md bg-dark-800 border border-dark-600 shadow-lg overflow-hidden">
              <button
                onClick={handleCopyYAML}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
              >
                <span className="text-primary-400">⎘</span>
                <div className="text-left">
                  <div className="font-medium">Copy DSL</div>
                  <div className="text-gray-500">YAML format</div>
                </div>
              </button>
              <div className="h-px bg-dark-600" />
              <button
                onClick={handleCopyPine}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
              >
                <span className="text-green-400">🌲</span>
                <div className="text-left">
                  <div className="font-medium">Copy Pine Script</div>
                  <div className="text-gray-500">TradingView v5</div>
                </div>
              </button>
            </div>
          )}
        </div>
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
