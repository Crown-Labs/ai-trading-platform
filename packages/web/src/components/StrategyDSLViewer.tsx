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
    ind.ema_fast != null && `EMA_F(${ind.ema_fast})`,
    ind.ema_slow != null && `EMA_S(${ind.ema_slow})`,
    ind.sma != null && `SMA(${ind.sma})`,
    ind.wma != null && `WMA(${ind.wma})`,
    ind.dema != null && `DEMA(${ind.dema})`,
    ind.tema != null && `TEMA(${ind.tema})`,
    ind.hma != null && `HMA(${ind.hma})`,
    ind.rsi != null && `RSI(${ind.rsi})`,
    ind.macd != null &&
      `MACD(${(ind.macd as any).fast ?? 12},${(ind.macd as any).slow ?? 26},${(ind.macd as any).signal ?? 9})`,
    ind.cci != null && `CCI(${ind.cci})`,
    ind.roc != null && `ROC(${ind.roc})`,
    ind.stochrsi != null && `StochRSI(${ind.stochrsi})`,
    ind.willr != null && `WillR(${ind.willr})`,
    ind.stoch != null && `STOCH(${(ind.stoch as any).kPeriod ?? 14})`,
    ind.atr != null && `ATR(${ind.atr})`,
    ind.bbands != null &&
      `BB(${(ind.bbands as any).period ?? 20},${(ind.bbands as any).stddev ?? 2})`,
    ind.kc != null && `KC(${(ind.kc as any).period ?? 20})`,
    ind.adx != null && `ADX(${ind.adx})`,
    ind.aroon != null && `Aroon(${ind.aroon})`,
    ind.psar != null && `PSAR(${(ind.psar as any).step ?? 0.02})`,
    ind.vwap != null && `VWAP`,
    ind.obv != null && `OBV`,
    ind.mfi != null && `MFI(${ind.mfi})`,
    ind.cmf != null && `CMF(${ind.cmf})`,
  ].filter(Boolean) as string[];

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
    <div className="px-3.5 py-1.5 border-b border-dark-700 bg-dark-800 flex items-center gap-2 flex-shrink-0 flex-wrap">
      {/* Strategy name */}
      <span className="font-bold text-[13px] text-gray-100 whitespace-nowrap">{strategy.name}</span>

      {/* Indicator badges */}
      {indicators.map((label) => (
        <span
          key={label}
          className="bg-dark-700 border border-dark-700 text-[10px] px-1.5 py-0.5 rounded text-accent whitespace-nowrap"
        >
          {label}
        </span>
      ))}

      {/* SL / TP / Size */}
      <div className="flex items-center gap-2 text-[11px] ml-auto">
        <span className="text-red">SL {strategy.risk.stop_loss}%</span>
        <span className="text-green">TP {strategy.risk.take_profit}%</span>
        <span className="text-muted">Size {strategy.risk.position_size}%</span>
      </div>

      {/* Copy dropdown */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="bg-dark-700 border border-dark-700 text-muted px-2 py-0.5 rounded text-[10px] cursor-pointer font-mono hover:text-gray-200 transition-colors"
        >
          {copied === 'yaml' ? '✓ YAML' : copied === 'pine' ? '✓ Pine' : '⎘ Copy ▾'}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[150px] rounded bg-dark-800 border border-dark-700 shadow-lg overflow-hidden">
            <button
              onClick={handleCopyYAML}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-dark-700 hover:text-white transition-colors text-left"
            >
              <span className="text-accent">⎘</span>
              <div>
                <div className="font-medium">Copy DSL</div>
                <div className="text-muted">YAML format</div>
              </div>
            </button>
            <div className="h-px bg-dark-700" />
            <button
              onClick={handleCopyPine}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-dark-700 hover:text-white transition-colors text-left"
            >
              <span className="text-green-400">🌲</span>
              <div>
                <div className="font-medium">Copy Pine Script</div>
                <div className="text-muted">TradingView v5</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
