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
}

export default function BacktestChart({ candles, trades }: BacktestChartProps) {
  const chartData = candles.map((c) => ({
    time: new Date(c.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    close: c.close,
    timestamp: c.timestamp,
  }));

  // Map trades to chart reference points
  const entryPoints = trades.map((t) => {
    const idx = chartData.findIndex(
      (d) =>
        new Date(d.timestamp).getTime() ===
        new Date(t.entryTime).getTime(),
    );
    return idx >= 0 ? { ...chartData[idx], type: 'entry' as const } : null;
  }).filter(Boolean);

  const exitPoints = trades.map((t) => {
    const idx = chartData.findIndex(
      (d) =>
        new Date(d.timestamp).getTime() ===
        new Date(t.exitTime).getTime(),
    );
    return idx >= 0 ? { ...chartData[idx], type: 'exit' as const } : null;
  }).filter(Boolean);

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-white mb-4">Price Chart</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#0ea5e9"
            dot={false}
            strokeWidth={1.5}
          />
          {entryPoints.map(
            (point, i) =>
              point && (
                <ReferenceDot
                  key={`entry-${i}`}
                  x={point.time}
                  y={point.close}
                  r={5}
                  fill="#22c55e"
                  stroke="#22c55e"
                />
              ),
          )}
          {exitPoints.map(
            (point, i) =>
              point && (
                <ReferenceDot
                  key={`exit-${i}`}
                  x={point.time}
                  y={point.close}
                  r={5}
                  fill="#ef4444"
                  stroke="#ef4444"
                />
              ),
          )}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Buy
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Sell
        </span>
      </div>
    </div>
  );
}
