import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
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
  const [activeTimeframe, setActiveTimeframe] = useState(defaultTimeframe);
  const [candles, setCandles] = useState(initialCandles);
  const [loading, setLoading] = useState(false);

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
  }, [activeTimeframe, symbol]);

  useEffect(() => {
    if (activeTimeframe === defaultTimeframe) {
      setCandles(initialCandles);
    }
  }, [initialCandles]);

  const chartData = candles.map((c) => ({
    time: new Date(c.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    fullTime: new Date(c.timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    price: c.close,
    timestamp: c.timestamp,
  }));

  const entryDots = trades.map((t) => ({
    timestamp: new Date(t.entryTime).getTime(),
    price: t.entryPrice,
    side: t.side,
  }));

  const exitDots = trades.map((t) => ({
    timestamp: new Date(t.exitTime).getTime(),
    price: t.exitPrice,
    isWin: t.isWin,
    side: t.side,
  }));

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
        <div className="flex items-center justify-center h-[280px] text-gray-500 text-sm">
          Loading {activeTimeframe} data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="time"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              domain={['auto', 'auto']}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#94a3b8', fontSize: 11 }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Price']}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.fullTime ?? ''
              }
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#0ea5e9"
              dot={false}
              strokeWidth={1.5}
            />
            {entryDots.map((dot, i) => {
              const idx = chartData.findIndex(
                (d) => Math.abs(d.timestamp - dot.timestamp) < 1000 * 60 * 60 * 2,
              );
              if (idx < 0) return null;
              const isShort = dot.side === 'short';
              return (
                <ReferenceDot
                  key={`entry-${i}`}
                  x={chartData[idx].time}
                  y={dot.price}
                  r={0}
                  fill="transparent"
                  stroke="transparent"
                  label={{
                    value: isShort ? '▼' : '▲',
                    position: isShort ? 'insideTop' : 'insideBottom',
                    fill: isShort ? '#f97316' : '#22c55e',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                />
              );
            })}
            {exitDots.map((dot, i) => {
              const idx = chartData.findIndex(
                (d) => Math.abs(d.timestamp - dot.timestamp) < 1000 * 60 * 60 * 2,
              );
              if (idx < 0) return null;
              const isShort = dot.side === 'short';
              const color = dot.isWin ? '#22c55e' : '#ef4444';
              return (
                <ReferenceDot
                  key={`exit-${i}`}
                  x={chartData[idx].time}
                  y={dot.price}
                  r={0}
                  fill="transparent"
                  stroke="transparent"
                  label={{
                    value: isShort ? '▲' : '▼',
                    position: isShort ? 'insideBottom' : 'insideTop',
                    fill: color,
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="text-green-500">▲</span> Long Entry
        </span>
        <span className="flex items-center gap-1">
          <span className="text-green-500">▼</span> Long Exit (win)
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-500">▼</span> Long Exit (loss)
        </span>
        <span className="flex items-center gap-1">
          <span className="text-orange-500">▼</span> Short Entry
        </span>
        <span className="flex items-center gap-1">
          <span className="text-green-500">▲</span> Short Exit (win)
        </span>
      </div>
    </div>
  );
}
