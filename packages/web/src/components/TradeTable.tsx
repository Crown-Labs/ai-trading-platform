import { useState } from 'react';
import { Trade } from '@ai-trading/shared';

interface TradeTableProps {
  trades: Trade[];
}

const PAGE_SIZE = 10; // trades (each trade = 2 rows)

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatPrice(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPnl(n: number) {
  const sign = n >= 0 ? '+' : '−';
  return sign + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TradeTable({ trades }: TradeTableProps) {
  const [page, setPage] = useState(1);
  const [sortDesc, setSortDesc] = useState(true); // newest first by default

  const sortedTrades = [...trades].sort((a, b) => {
    const diff = new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime();
    return sortDesc ? -diff : diff;
  });
  const totalPages = Math.ceil(sortedTrades.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const paginated = sortedTrades.slice(start, start + PAGE_SIZE);

  const initialCapital = 1_000_000;

  // Cumulative P&L keyed by trade id (based on original order)
  const cumPnlMap: Record<number, number> = {};
  let running = 0;
  for (const t of trades) {
    running += t.pnl;
    cumPnlMap[t.id] = running;
  }

  const totalPnl = sortedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalFees = sortedTrades.reduce((sum, t) => sum + t.fees, 0);
  const winCount = sortedTrades.filter((t) => t.isWin).length;

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Trade History</h2>
        <span className="text-xs text-gray-500">
          {trades.length > 0
            ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, trades.length)} of ${trades.length} trades`
            : '0 trades'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-dark-700">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-left py-2 px-2">
                <button
                  onClick={() => { setSortDesc(d => !d); setPage(1); }}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Date / Time
                  <span className="text-gray-600">{sortDesc ? '↓' : '↑'}</span>
                </button>
              </th>
              <th className="text-left py-2 px-2">Signal</th>
              <th className="text-right py-2 px-2">Price</th>
              <th className="text-right py-2 px-2">Net P&amp;L</th>
              <th className="text-right py-2 px-2">Cumulative P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((trade) => {
              const cum = cumPnlMap[trade.id] ?? 0;
              const cumPct = (cum / initialCapital) * 100;
              const pnlPct = trade.pnl / initialCapital * 100;
              const isLong = trade.side === 'long';
              const entrySignal = isLong ? 'Long' : 'Short';
              const exitSignal = isLong ? 'Long Exit' : 'Short Exit';
              const sideColor = isLong ? 'text-green-400' : 'text-red-400';
              const sideBg = isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';

              return [
                // Entry row
                <tr key={`${trade.id}-entry`} className="border-t border-dark-700/40 hover:bg-dark-700/20">
                  <td className="py-1.5 px-2 text-gray-400 font-medium align-middle" rowSpan={2}>
                    {trade.id}
                  </td>
                  <td className="py-1.5 px-2 align-middle">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sideBg}`}>
                      Entry
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-gray-400 align-middle">{formatDate(trade.entryTime)}</td>
                  <td className={`py-1.5 px-2 font-medium align-middle ${sideColor}`}>{entrySignal}</td>
                  <td className="py-1.5 px-2 text-right text-gray-300 align-middle">{formatPrice(trade.entryPrice)}</td>
                  <td className="py-1.5 px-2 text-right text-gray-600 align-middle">—</td>
                  <td className="py-1.5 px-2 text-right text-gray-600 align-middle">—</td>
                </tr>,

                // Exit row
                <tr key={`${trade.id}-exit`} className="border-b border-dark-700/60 hover:bg-dark-700/20">
                  <td className="py-1.5 px-2 align-middle">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-dark-600 text-gray-400">
                      Exit
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-gray-400 align-middle">{formatDate(trade.exitTime)}</td>
                  <td className={`py-1.5 px-2 font-medium align-middle ${trade.isWin ? 'text-green-400' : 'text-red-400'}`}>
                    {exitSignal}
                  </td>
                  <td className="py-1.5 px-2 text-right text-gray-300 align-middle">{formatPrice(trade.exitPrice)}</td>
                  <td className={`py-1.5 px-2 text-right font-medium align-middle ${trade.isWin ? 'text-green-400' : 'text-red-400'}`}>
                    <div>{formatPnl(trade.pnl)}</div>
                    <div className="text-xs opacity-70">{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                  </td>
                  <td className={`py-1.5 px-2 text-right font-medium align-middle ${cum >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <div>{formatPnl(cum)}</div>
                    <div className="text-xs opacity-70">{cumPct >= 0 ? '+' : ''}{cumPct.toFixed(2)}%</div>
                  </td>
                </tr>,
              ];
            })}
            {trades.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 text-sm">
                  No trades yet. Run a backtest to see results.
                </td>
              </tr>
            )}
          </tbody>
          {trades.length > 0 && (
            <tfoot>
              <tr className="border-t border-dark-600 bg-dark-700/30">
                <td colSpan={5} className="py-2 px-2 text-xs text-gray-500">
                  {winCount}W / {trades.length - winCount}L &middot; Fees: ${totalFees.toFixed(2)}
                </td>
                <td colSpan={2} className={`py-2 px-2 text-right font-semibold text-sm ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPnl(totalPnl)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 text-xs rounded bg-dark-700 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
            &larr; Prev
          </button>
          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`e-${i}`} className="px-2 text-gray-600 text-xs">&hellip;</span>
            ) : (
              <button key={p} onClick={() => setPage(p as number)}
                className={`w-7 h-7 text-xs rounded transition-colors ${page === p ? 'bg-primary-600 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'}`}>
                {p}
              </button>
            )
          )}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 text-xs rounded bg-dark-700 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
