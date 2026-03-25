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
    <div className="card py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              activeIndex > 0 && onSelect(runs[activeIndex - 1].id)
            }
            disabled={activeIndex <= 0}
            className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-1"
          >
            &larr;
          </button>

          <div className="flex items-center gap-1">
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => onSelect(run.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  run.id === activeRunId
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                v{run.version}
                {run.id === activeRunId && ' \u2605'}
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              activeIndex < runs.length - 1 &&
              onSelect(runs[activeIndex + 1].id)
            }
            disabled={activeIndex >= runs.length - 1}
            className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-1"
          >
            &rarr;
          </button>
        </div>

        {activeRun && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="text-gray-300 font-medium">
              {activeRun.strategyName}
            </span>
            <span>
              {activeRun.startDate.slice(0, 7)} &rarr;{' '}
              {activeRun.endDate.slice(0, 7)}
            </span>
            <span
              className={`font-semibold ${
                activeRun.result.metrics.totalReturn >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {activeRun.result.metrics.totalReturn >= 0 ? '+' : ''}
              {activeRun.result.metrics.totalReturn.toFixed(1)}%
            </span>
            <span className="text-gray-600">
              WR {activeRun.result.metrics.winRate.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Data coverage warning */}
      {activeRun?.result.dataRange && !activeRun.result.dataRange.isComplete && (
        <div className="mt-2 flex items-center gap-2 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-1.5">
          <span className="text-yellow-400">⚠️</span>
          <span className="text-yellow-300">
            Data available:{' '}
            <span className="font-medium">
              {activeRun.result.dataRange.actualStart.slice(0, 7)} – {activeRun.result.dataRange.actualEnd.slice(0, 7)}
            </span>{' '}
            ({activeRun.result.dataRange.actualDays} of {activeRun.result.dataRange.requestedDays} days,{' '}
            {Math.round((activeRun.result.dataRange.actualDays / activeRun.result.dataRange.requestedDays) * 100)}% coverage)
          </span>
        </div>
      )}
    </div>
  );
}
