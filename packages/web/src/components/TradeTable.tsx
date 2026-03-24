import { useState } from 'react';
import { Trade } from '@ai-trading/shared';

interface TradeTableProps {
  trades: Trade[];
}

const PAGE_SIZE = 10;

export default function TradeTable({ trades }: TradeTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(trades.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const paginated = trades.slice(start, start + PAGE_SIZE);

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
  const winCount = trades.filter((t) => t.isWin).length;

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      ) {
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
            ? `Showing ${start + 1}\u2013${Math.min(start + PAGE_SIZE, trades.length)} of ${trades.length} trades`
            : '0 trades'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-dark-700">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Side</th>
              <th className="text-left py-2 px-2">Entry Time</th>
              <th className="text-left py-2 px-2">Exit Time</th>
              <th className="text-right py-2 px-2">Entry $</th>
              <th className="text-right py-2 px-2">Exit $</th>
              <th className="text-right py-2 px-2">P&amp;L</th>
              <th className="text-right py-2 px-2">%</th>
              <th className="text-right py-2 px-2">Fees</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((trade) => (
              <tr
                key={trade.id}
                className="border-b border-dark-700/50 hover:bg-dark-700/30"
              >
                <td className="py-2 px-2 text-gray-500 text-xs">{trade.id}</td>
                <td className="py-2 px-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      trade.side === 'long'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {trade.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 px-2 text-gray-400 text-xs">
                  {new Date(trade.entryTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit',
                  })}
                </td>
                <td className="py-2 px-2 text-gray-400 text-xs">
                  {new Date(trade.exitTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit',
                  })}
                </td>
                <td className="py-2 px-2 text-right text-gray-300 text-xs">
                  ${trade.entryPrice.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-gray-300 text-xs">
                  ${trade.exitPrice.toLocaleString()}
                </td>
                <td
                  className={`py-2 px-2 text-right font-medium text-xs ${
                    trade.isWin ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {trade.pnl >= 0 ? '+' : '−'}${Math.abs(trade.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td
                  className={`py-2 px-2 text-right font-medium text-xs ${
                    trade.isWin ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {trade.pnlPercent}
                </td>
                <td className="py-2 px-2 text-right text-gray-600 text-xs">
                  ${trade.fees.toFixed(2)}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="py-8 text-center text-gray-500 text-sm"
                >
                  No trades yet. Run a backtest to see results.
                </td>
              </tr>
            )}
          </tbody>
          {trades.length > 0 && (
            <tfoot>
              <tr className="border-t border-dark-600 bg-dark-700/30">
                <td colSpan={6} className="py-2 px-2 text-xs text-gray-500">
                  {winCount}W / {trades.length - winCount}L &middot; Fees: $
                  {totalFees.toFixed(2)}
                </td>
                <td
                  colSpan={3}
                  className={`py-2 px-2 text-right font-semibold text-sm ${
                    totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {totalPnl >= 0 ? '+' : '−'}${Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <span
                key={`ellipsis-${i}`}
                className="px-2 text-gray-600 text-xs"
              >
                &hellip;
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`w-7 h-7 text-xs rounded transition-colors ${
                  page === p
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-gray-400 hover:text-white'
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
