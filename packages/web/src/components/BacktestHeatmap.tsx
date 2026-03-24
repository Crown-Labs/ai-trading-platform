import { Trade } from '@ai-trading/shared';
import { useMemo, useState } from 'react';

interface BacktestHeatmapProps {
  trades: Trade[];
}

interface DayData {
  date: string;
  pnl: number;
  trades: number;
  isWin: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getColorClass(day: DayData | undefined): string {
  if (!day || day.trades === 0) return 'bg-dark-700';
  if (day.pnl > 0) {
    if (day.pnl > 500) return 'bg-green-400';
    if (day.pnl > 200) return 'bg-green-500';
    return 'bg-green-600';
  } else {
    if (day.pnl < -500) return 'bg-red-400';
    if (day.pnl < -200) return 'bg-red-500';
    return 'bg-red-600';
  }
}

export default function BacktestHeatmap({ trades }: BacktestHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    day: DayData;
  } | null>(null);

  const { dayMap, weeks, monthLabels } = useMemo(() => {
    const dayMap: Record<string, DayData> = {};

    trades.forEach((trade) => {
      const date = new Date(trade.exitTime).toISOString().slice(0, 10);
      if (!dayMap[date]) {
        dayMap[date] = { date, pnl: 0, trades: 0, isWin: false };
      }
      dayMap[date].pnl += trade.pnl;
      dayMap[date].trades += 1;
    });

    Object.values(dayMap).forEach((d) => {
      d.isWin = d.pnl > 0;
    });

    if (trades.length === 0) return { dayMap, weeks: [] as (string | null)[][], monthLabels: [] as { col: number; month: string }[] };

    const dates = Object.keys(dayMap).sort();
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);

    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay());

    const end = new Date(endDate);
    end.setDate(end.getDate() + (6 - end.getDay()));

    const weeks: (string | null)[][] = [];
    const monthLabelMap: { col: number; month: string }[] = [];
    const current = new Date(start);
    let weekIdx = 0;
    let lastMonth = -1;

    while (current <= end) {
      const week: (string | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().slice(0, 10);
        week.push(dateStr);

        if (current.getDate() <= 7 && current.getMonth() !== lastMonth) {
          monthLabelMap.push({ col: weekIdx, month: MONTHS[current.getMonth()] });
          lastMonth = current.getMonth();
        }

        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
      weekIdx++;
    }

    return { dayMap, weeks, monthLabels: monthLabelMap };
  }, [trades]);

  if (trades.length === 0) return null;

  const winDays = Object.values(dayMap).filter((d) => d.pnl > 0).length;
  const lossDays = Object.values(dayMap).filter((d) => d.pnl <= 0).length;
  const totalDays = winDays + lossDays;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Daily P&amp;L Heatmap</h2>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
            Win ({winDays} days)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
            Loss ({lossDays} days)
          </span>
          <span className="text-gray-600">
            Win rate: {totalDays > 0 ? ((winDays / totalDays) * 100).toFixed(0) : 0}%
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-full">
          {/* Month labels */}
          <div className="flex gap-1 ml-8">
            {weeks.map((_, colIdx) => {
              const label = monthLabels.find((m) => m.col === colIdx);
              return (
                <div key={colIdx} className="w-3 text-xs text-gray-500 text-center">
                  {label ? label.month : ''}
                </div>
              );
            })}
          </div>

          {/* Day rows */}
          {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => (
            <div key={dayOfWeek} className="flex items-center gap-1">
              <span className="w-7 text-right text-xs text-gray-600 pr-1">
                {dayOfWeek % 2 === 1 ? DAYS[dayOfWeek] : ''}
              </span>
              {weeks.map((week, weekIdx) => {
                const dateStr = week[dayOfWeek];
                const day = dateStr ? dayMap[dateStr] : undefined;
                const colorClass = getColorClass(day);
                return (
                  <div
                    key={weekIdx}
                    className={`w-3 h-3 rounded-sm ${colorClass} cursor-pointer transition-all hover:scale-125 hover:ring-1 hover:ring-white/30`}
                    onMouseEnter={(e) => {
                      if (!day) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        day,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-1 mt-3 justify-end">
        <span className="text-xs text-gray-600 mr-1">Less</span>
        <div className="w-3 h-3 rounded-sm bg-dark-700" />
        <div className="w-3 h-3 rounded-sm bg-red-600" />
        <div className="w-3 h-3 rounded-sm bg-red-500" />
        <div className="w-3 h-3 rounded-sm bg-red-400" />
        <div className="w-3 h-3 rounded-sm bg-green-600" />
        <div className="w-3 h-3 rounded-sm bg-green-500" />
        <div className="w-3 h-3 rounded-sm bg-green-400" />
        <span className="text-xs text-gray-600 ml-1">More</span>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
            <p className="text-gray-300 font-medium mb-0.5">{tooltip.day.date}</p>
            <p className={`font-semibold ${tooltip.day.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {tooltip.day.pnl >= 0 ? '+' : ''}${tooltip.day.pnl.toFixed(2)}
            </p>
            <p className="text-gray-500 text-xs">
              {tooltip.day.trades} trade{tooltip.day.trades !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-dark-600" />
        </div>
      )}
    </div>
  );
}
