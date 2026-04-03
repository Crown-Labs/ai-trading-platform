import { BacktestRun } from '@ai-trading/shared';
import { Badge, TerminalButton } from './ui';

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
    <div className="px-3.5 py-1.5 border-b border-dark-700 bg-dark-800 flex items-start justify-between flex-wrap gap-1.5 flex-shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-muted uppercase tracking-wider">Runs:</span>
        <TerminalButton
          variant="ghost"
          size="sm"
          onClick={() => activeIndex > 0 && onSelect(runs[activeIndex - 1].id)}
          disabled={activeIndex <= 0}
        >
          ←
        </TerminalButton>
        <div className="flex items-center gap-1">
          {runs.map((run) => (
            <Badge
              key={run.id}
              variant={run.id === activeRunId ? 'accent' : 'outline'}
              onClick={() => onSelect(run.id)}
              className="font-semibold font-mono px-2.5"
            >
              v{run.version}
              {run.id === activeRunId ? ' ★' : ''}
            </Badge>
          ))}
        </div>
        <TerminalButton
          variant="ghost"
          size="sm"
          onClick={() => activeIndex < runs.length - 1 && onSelect(runs[activeIndex + 1].id)}
          disabled={activeIndex >= runs.length - 1}
        >
          →
        </TerminalButton>
      </div>

      {activeRun && (
        <div className="flex items-center gap-2.5 text-[10px] text-muted flex-wrap">
          <span className="text-gray-200 font-semibold">{activeRun.strategyName}</span>
          <span>
            {activeRun.startDate.slice(0, 7)} → {activeRun.endDate.slice(0, 7)}
          </span>
          <span
            className={`font-bold ${
              activeRun.result.metrics.totalReturn >= 0 ? 'text-green' : 'text-red'
            }`}
          >
            {activeRun.result.metrics.totalReturn >= 0 ? '+' : ''}
            {activeRun.result.metrics.totalReturn.toFixed(1)}%
          </span>
          <span>WR {activeRun.result.metrics.winRate.toFixed(0)}%</span>
        </div>
      )}

      {/* Insufficient historical data warning */}
      {activeRun?.result.dataRange?.hasInsufficientData && (
        <div className="w-full py-0.5 px-2 text-[10px] rounded mt-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-300">
          ⚠️ Insufficient historical data for indicator warm-up (
          {activeRun.result.dataRange.warmupBars} bars needed before{' '}
          {activeRun.result.dataRange.requestedStart}). Results may be less accurate — consider
          using a longer date range.
        </div>
      )}

      {/* Data coverage warning */}
      {activeRun?.result.dataRange && !activeRun.result.dataRange.isComplete && (
        <div className="w-full py-0.5 px-2 text-[10px] rounded mt-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
          ⚠️ Data available:{' '}
          <span className="font-medium">
            {activeRun.result.dataRange.actualStart.slice(0, 7)} –{' '}
            {activeRun.result.dataRange.actualEnd.slice(0, 7)}
          </span>{' '}
          ({activeRun.result.dataRange.actualDays} of {activeRun.result.dataRange.requestedDays}{' '}
          days,{' '}
          {Math.round(
            (activeRun.result.dataRange.actualDays / activeRun.result.dataRange.requestedDays) *
              100,
          )}
          % coverage)
        </div>
      )}
    </div>
  );
}
