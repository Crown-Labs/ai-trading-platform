import { useState } from 'react';
import { Trade } from '@ai-trading/shared';

interface TradeTableProps {
  trades: Trade[];
}

const PAGE_SIZE = 10;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatPrice(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPnl(n: number) {
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '−';
  return sign + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TradeTable({ trades }: TradeTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(trades.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const paginated = trades.slice(start, start + PAGE_SIZE);

  // Compute cumulative P&L up to each trade
  const cumPnl: number[] = [];
  let running = 0;
  for (const t of trades) {
    running += t.pnl;
    cumPnl.push(running);
  }

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
  const winCount = trades.filter((t) => t.isWin).length;
  const initialCapital = 1_000_000;

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
              <th className="text-left py-2 px-2 w-10">Trade #</th>
              <th className="text-left py-2 px-2 w-14">Type</th>
              <th className="text-left py-2 px-2">Date and time</th>
              <th className="text-left py-2 px-2">Signal</th>
              <th className="text-right py-2 px-2">Price</th>
              <th className="text-right py-2 px-2">Net P&amp;L</th>
              <th className="text-right py-2 px-2">Cumulative P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((trade, idx) => {
              const absoluteIdx = start + idx;
              const cum = cumPnl[absoluteIdx];
              const cumPct = (cum / initialCapital) * 100;
              const pnlPct = parseFloat(trade.pnlPercent) || (trade.pnl / initialCapital * 100);

              return (
                <tr key={trade.id} className="border-b border-dark-700/40 hover:bg-dark-700/20">
                  {/* Trade # + Type — spans 2 visual rows via padding trick */}
                  <td className="py-0 px-2 align-top">
                    <div className="flex flex-col justify-center h-full py-1">
                      <span className="text-gray-400 font-medium">{trade.id}</span>
                    </div>
                  </td>
                  <td className="py-0 px-2 align-top">
                    <div className="py-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        trade.side === 'long'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side === 'long' ? 'Long' : 'Short'}
                      </span>
                    </div>
                  </td>
                  {/* Entry + Exit stacked */}
                  <td className="py-0 px-2">
                    <div className="flex flex-col gap-0.5 py-1">
                      <span className="text-gray-300">{formatDate(trade.exitTime)}</span>
                      <span className="text-gray-500">{formatDate(trade.entryTime)}</span>
                    </div>
                  </td>
                  <td className="py-0 px-2">
                    <div className="flex flex-col gap-0.5 py-1">
                      <span className={trade.side === 'long' ? 'text-green-400' : 'text-red-400'}>
                        {trade.side === 'long' ? 'Long Exit' : 'Short Exit'}
                      </span>
                      <span className={trade.side === 'long' ? 'text-green-600' : 'text-red-600'}>
                        {trade.side === 'long' ? 'Long' : 'Short'}
                      </span>
                    </div>
                  </td>
                  <td className="py-0 px-2 text-right">
                    <div className="flex flex-col gap-0.5 py-1">
                      <span className="text-gray-300">{formatPrice(trade.exitPrice)}</span>
                      <span className="text-gray-500">{formatPrice(trade.entryPrice)}</span>
                    </div>
                  </td>
                  {/* Net P&L */}
                  <td className="py-0 px-2 text-right align-middle">
                    <div className="flex flex-col items-end justify-center py-1 gap-0">
                      <span className={`font-medium ${trade.isWin ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPnl(trade.pnl)}
                      </span>
                      <span className={`text-xs ${trade.isWin ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  {/* Cumulative P&L */}
                  <td className="py-0 px-2 text-right align-middle">
                    <div className="flex flex-col items-end justify-center py-1 gap-0">
                      <span className={`font-medium ${cum >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPnl(cum)}
                      </span>
                      <span className={`text-xs ${cum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cumPct >= 0 ? '+' : ''}{cumPct.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
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
                <td colSpan={2} className={`py-2 px-2 text-right font-semibold text-sm ${
                  totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPnl(totalPnl)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-xs rounded bg-dark-700 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &larr; Prev
          </button>
          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`e-${i}`} className="px-2 text-gray-600 text-xs">&hellip;</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`w-7 h-7 text-xs rounded transition-colors ${
                  page === p ? 'bg-primary-600 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-xs rounded bg-dark-700 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
