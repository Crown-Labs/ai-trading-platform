import { BacktestMetrics } from '@ai-trading/shared';

interface BacktestStatsProps {
  metrics: BacktestMetrics;
}

export default function BacktestStats({ metrics }: BacktestStatsProps) {
  const stats = [
    {
      label: 'Total Trades',
      value: metrics.totalTrades.toString(),
      color: 'text-white',
    },
    {
      label: 'Win Rate',
      value: `${metrics.winRate}%`,
      color: metrics.winRate >= 50 ? 'text-green-500' : 'text-red-500',
    },
    {
      label: 'Total Return',
      value: `${metrics.totalReturn > 0 ? '+' : ''}${metrics.totalReturn}%`,
      color: metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500',
    },
    {
      label: 'Max Drawdown',
      value: `-${metrics.maxDrawdown}%`,
      color: 'text-red-500',
    },
    {
      label: 'Sharpe Ratio',
      value: metrics.sharpeRatio.toFixed(2),
      color: metrics.sharpeRatio >= 1 ? 'text-green-500' : metrics.sharpeRatio >= 0 ? 'text-yellow-500' : 'text-red-500',
    },
    {
      label: 'Profit Factor',
      value: metrics.profitFactor.toFixed(2),
      color: metrics.profitFactor >= 1.5 ? 'text-green-500' : metrics.profitFactor >= 1 ? 'text-yellow-500' : 'text-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card text-center">
          <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
          <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
