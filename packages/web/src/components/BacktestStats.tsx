import { BacktestMetrics } from '@ai-trading/shared';

interface BacktestStatsProps {
  metrics: BacktestMetrics;
}

export default function BacktestStats({ metrics }: BacktestStatsProps) {
  const stats = [
    {
      label: 'Total Return',
      value: `${metrics.totalReturn > 0 ? '+' : ''}${metrics.totalReturn.toFixed(1)}%`,
      colorStyle: metrics.totalReturn >= 0 ? 'var(--green)' : 'var(--red)',
    },
    {
      label: 'Win Rate',
      value: `${metrics.winRate.toFixed(1)}%`,
      colorStyle: metrics.winRate >= 50 ? 'var(--green)' : 'var(--red)',
    },
    {
      label: 'Total Trades',
      value: metrics.totalTrades.toString(),
      colorStyle: 'var(--text)',
    },
    {
      label: 'Max Drawdown',
      value: `-${metrics.maxDrawdown.toFixed(1)}%`,
      colorStyle: 'var(--red)',
    },
    {
      label: 'Sharpe Ratio',
      value: metrics.sharpeRatio.toFixed(2),
      colorStyle:
        metrics.sharpeRatio >= 1
          ? 'var(--green)'
          : metrics.sharpeRatio >= 0
          ? 'var(--accent)'
          : 'var(--red)',
    },
    {
      label: 'Profit Factor',
      value: metrics.profitFactor.toFixed(2),
      colorStyle:
        metrics.profitFactor >= 1.5
          ? 'var(--green)'
          : metrics.profitFactor >= 1
          ? 'var(--accent)'
          : 'var(--red)',
    },
  ];

  return (
    <div
      className="grid border-b border-terminal-border flex-shrink-0"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1px',
        background: 'var(--border)',
      }}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-terminal-surface"
          style={{ padding: '10px 12px' }}
        >
          <div
            className="text-terminal-muted"
            style={{
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: '4px',
            }}
          >
            {stat.label}
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: 1,
              color: stat.colorStyle,
            }}
          >
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
