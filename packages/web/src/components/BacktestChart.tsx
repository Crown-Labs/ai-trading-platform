import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type CandlestickData,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
import { Trade, OHLCVCandle } from '@ai-trading/shared';

interface BacktestChartProps {
  candles: OHLCVCandle[];
  trades: Trade[];
  symbol: string;
  defaultTimeframe?: string;
}

const TIMEFRAMES = ['1h', '4h', '1d'];

export default function BacktestChart({
  candles: initialCandles,
  trades,
  symbol,
  defaultTimeframe = '1h',
}: BacktestChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState(defaultTimeframe);
  const [candles, setCandles] = useState(initialCandles);
  const [loading, setLoading] = useState(false);

  // Fetch candles when timeframe changes
  useEffect(() => {
    if (!symbol) return;
    if (activeTimeframe === defaultTimeframe) {
      setCandles(initialCandles);
      return;
    }
    setLoading(true);
    fetch(
      `http://localhost:4000/api/market-data/candles?symbol=${symbol}&interval=${activeTimeframe}&limit=500`,
    )
      .then((r) => r.json())
      .then((data) => setCandles(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTimeframe, symbol, defaultTimeframe, initialCandles]);

  // Reset to default timeframe and update candles when new backtest data arrives
  useEffect(() => {
    setActiveTimeframe(defaultTimeframe);
    setCandles(initialCandles);
  }, [initialCandles, defaultTimeframe]);

  // Create chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        vertLine: { color: '#334155' },
        horzLine: { color: '#334155' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#16a34a',
      borderDownColor: '#dc2626',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (markersPluginRef.current) {
        markersPluginRef.current = null;
      }
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update candle data + markers
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const data: CandlestickData[] = candles
      .map((c) => ({
        time: Math.floor(c.timestamp / 1000) as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    seriesRef.current.setData(data);

    // Build markers from trades
    const markers: SeriesMarker<Time>[] = [];
    for (const trade of trades) {
      const entryTime = (Math.floor(
        new Date(trade.entryTime).getTime() / 1000,
      )) as Time;
      const exitTime = (Math.floor(
        new Date(trade.exitTime).getTime() / 1000,
      )) as Time;
      const isShort = trade.side === 'short';

      markers.push({
        time: entryTime,
        position: isShort ? 'aboveBar' : 'belowBar',
        color: isShort ? '#ef4444' : '#22c55e',
        shape: isShort ? 'arrowDown' : 'arrowUp',
        text: isShort ? 'S' : 'L',
        size: 1,
      });

      markers.push({
        time: exitTime,
        position: isShort ? 'belowBar' : 'aboveBar',
        color: trade.isWin ? '#22c55e' : '#ef4444',
        shape: isShort ? 'arrowUp' : 'arrowDown',
        text: trade.pnlPercent,
        size: 1,
      });
    }

    markers.sort((a, b) => (a.time as number) - (b.time as number));

    // Update markers: create plugin on first run, then update existing
    if (!markersPluginRef.current) {
      // First time: create the markers plugin
      markersPluginRef.current = createSeriesMarkers(seriesRef.current, markers);
    } else {
      // Update existing markers plugin (clears old markers automatically)
      markersPluginRef.current.setMarkers(markers);
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles, trades]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Price Chart</h2>
        <div className="flex gap-1 bg-dark-700 rounded-lg p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTimeframe === tf
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[320px] text-gray-500 text-sm">
          Loading {activeTimeframe} data...
        </div>
      ) : (
        <div ref={chartContainerRef} className="w-full" />
      )}

      <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
        <span>
          <span className="text-green-500 font-bold">&#x25B2; L</span> Long
          Entry
        </span>
        <span>
          <span className="text-orange-500 font-bold">&#x25BC; S</span> Short
          Entry
        </span>
        <span>
          <span className="text-green-500 font-bold">&#x25BC;</span> Exit (win)
        </span>
        <span>
          <span className="text-red-500 font-bold">&#x25BC;</span> Exit (loss)
        </span>
      </div>
    </div>
  );
}
