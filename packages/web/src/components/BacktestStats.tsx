import { BacktestMetrics } from '@ai-trading/shared';
import { StatCell } from './ui';

interface BacktestStatsProps {
  metrics: BacktestMetrics;
}

export default function BacktestStats({ metrics }: BacktestStatsProps) {
  const stats: { label: string; value: string; valueColor: 'green' | 'red' | 'accent' | 'white' }[] = [
    {
      label: 'Total Return',
      value: `${metrics.totalReturn > 0 ? '+' : ''}${metrics.totalReturn.toFixed(1)}%`,
      valueColor: metrics.totalReturn >= 0 ? 'green' : 'red',
    },
    {
      label: 'Win Rate',
      value: `${metrics.winRate.toFixed(1)}%`,
      valueColor: 'accent',
    },
    {
      label: 'Sharpe Ratio',
      value: metrics.sharpeRatio.toFixed(2),
      valueColor: 'accent',
    },
    {
      label: 'Max Drawdown',
      value: `−${metrics.maxDrawdown.toFixed(1)}%`,
      valueColor: 'red',
    },
    {
      label: 'Total Trades',
      value: metrics.totalTrades.toString(),
      valueColor: 'white',
    },
    {
      label: 'Profit Factor',
      value: metrics.profitFactor.toFixed(2),
      valueColor:
        metrics.profitFactor >= 1.5
          ? 'green'
          : metrics.profitFactor >= 1
            ? 'accent'
            : 'red',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px bg-dark-700 border-b border-dark-700 flex-shrink-0">
      {stats.map((stat) => (
        <StatCell
          key={stat.label}
          label={stat.label}
          value={stat.value}
          valueColor={stat.valueColor}
        />
      ))}
    </div>
  );
}
