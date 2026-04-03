import { BacktestMetrics } from '@ai-trading/shared';

interface BacktestStatsProps {
  metrics: BacktestMetrics;
}

export default function BacktestStats({ metrics }: BacktestStatsProps) {
  const stats = [
    {
      label: 'Total Return',
      value: `${metrics.totalReturn > 0 ? '+' : ''}${metrics.totalReturn.toFixed(1)}%`,
      color: metrics.totalReturn >= 0 ? 'text-green' : 'text-red',
    },
    {
      label: 'Win Rate',
      value: `${metrics.winRate.toFixed(1)}%`,
      color: 'text-accent',
    },
    {
      label: 'Sharpe Ratio',
      value: metrics.sharpeRatio.toFixed(2),
      color: 'text-accent',
    },
    {
      label: 'Max Drawdown',
      value: `−${metrics.maxDrawdown.toFixed(1)}%`,
      color: 'text-red',
    },
    {
      label: 'Total Trades',
      value: metrics.totalTrades.toString(),
      color: 'text-gray-100',
    },
    {
      label: 'Profit Factor',
      value: metrics.profitFactor.toFixed(2),
      color:
        metrics.profitFactor >= 1.5
          ? 'text-green'
          : metrics.profitFactor >= 1
            ? 'text-accent'
            : 'text-red',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px bg-dark-700 border-b border-dark-700 flex-shrink-0">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-dark-800 px-3 py-2.5">
          <div className="text-[9px] text-muted uppercase tracking-wider mb-1">{stat.label}</div>
          <div className={`text-base font-bold leading-tight ${stat.color}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
