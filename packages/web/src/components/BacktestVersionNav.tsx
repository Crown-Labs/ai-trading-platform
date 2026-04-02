import { BacktestRun } from '@ai-trading/shared';

interface BacktestVersionNavProps {
  runs: BacktestRun[];
  activeRunId?: string;
  onSelect: (runId: string) => void;
}

export default function BacktestVersionNav({
  runs,
  activeRunId,
  onSelect,
}: BacktestVersionNavProps) {
  if (runs.length === 0) return null;

  const activeIndex = runs.findIndex((r) => r.id === activeRunId);
  const activeRun = runs[activeIndex];

  return (
    <div
      className="flex flex-col flex-shrink-0 bg-terminal-surface border-b border-terminal-border"
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '6px 14px' }}
      >
        {/* Left: version buttons */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-terminal-muted"
            style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.07em' }}
          >
            Runs
          </span>

          <button
            onClick={() => activeIndex > 0 && onSelect(runs[activeIndex - 1].id)}
            disabled={activeIndex <= 0}
            className="text-terminal-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '12px' }}
            onMouseEnter={(e) => { if (activeIndex > 0) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = ''; }}
          >
            ←
          </button>

          <div className="flex items-center gap-1">
            {runs.map((run) => {
              const isActive = run.id === activeRunId;
              return (
                <button
                  key={run.id}
                  onClick={() => onSelect(run.id)}
                  className="transition-all"
                  style={{
                    padding: '3px 9px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--bg)' : 'var(--muted)',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
                    }
                  }}
                >
                  v{run.version}
                  {isActive && ' ★'}
                </button>
              );
            })}
          </div>

          <button
            onClick={() =>
              activeIndex < runs.length - 1 && onSelect(runs[activeIndex + 1].id)
            }
            disabled={activeIndex >= runs.length - 1}
            className="text-terminal-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '12px' }}
            onMouseEnter={(e) => { if (activeIndex < runs.length - 1) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = ''; }}
          >
            →
          </button>
        </div>

        {/* Right: run details */}
        {activeRun && (
          <div className="flex items-center gap-3 text-terminal-muted" style={{ fontSize: '10px' }}>
            <span className="text-terminal-text font-medium">{activeRun.strategyName}</span>
            <span className="text-terminal-muted">
              {activeRun.startDate.slice(0, 7)} → {activeRun.endDate.slice(0, 7)}
            </span>
            <span
              style={{
                fontWeight: 600,
                color:
                  activeRun.result.metrics.totalReturn >= 0 ? 'var(--green)' : 'var(--red)',
              }}
            >
              {activeRun.result.metrics.totalReturn >= 0 ? '+' : ''}
              {activeRun.result.metrics.totalReturn.toFixed(1)}%
            </span>
            <span className="text-terminal-muted">
              WR {activeRun.result.metrics.winRate.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Insufficient historical data warning */}
      {activeRun?.result.dataRange?.hasInsufficientData && (
        <div
          className="flex items-center gap-2 border-t border-terminal-border"
          style={{
            padding: '5px 14px',
            fontSize: '11px',
            background: 'rgba(240,140,0,0.08)',
            borderColor: 'rgba(240,140,0,0.2)',
          }}
        >
          <span style={{ color: '#f59e0b' }}>⚠</span>
          <span style={{ color: '#fbbf24' }}>
            Insufficient historical data for warm-up (
            {activeRun.result.dataRange.warmupBars} bars before{' '}
            {activeRun.result.dataRange.requestedStart}). Consider a longer date range.
          </span>
        </div>
      )}

      {/* Data coverage warning */}
      {activeRun?.result.dataRange && !activeRun.result.dataRange.isComplete && (
        <div
          className="flex items-center gap-2 border-t border-terminal-border"
          style={{
            padding: '5px 14px',
            fontSize: '11px',
            background: 'rgba(240,185,11,0.06)',
            borderColor: 'rgba(240,185,11,0.15)',
          }}
        >
          <span style={{ color: 'var(--accent)' }}>⚠</span>
          <span style={{ color: '#fcd34d' }}>
            Data available:{' '}
            <strong>
              {activeRun.result.dataRange.actualStart.slice(0, 7)} –{' '}
              {activeRun.result.dataRange.actualEnd.slice(0, 7)}
            </strong>{' '}
            ({activeRun.result.dataRange.actualDays} of{' '}
            {activeRun.result.dataRange.requestedDays} days,{' '}
            {Math.round(
              (activeRun.result.dataRange.actualDays /
                activeRun.result.dataRange.requestedDays) *
                100,
            )}
            % coverage)
          </span>
        </div>
      )}
    </div>
  );
}
