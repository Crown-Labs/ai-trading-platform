import { useState } from 'react';
import { Trade } from '@ai-trading/shared';
import { Badge, SectionHeader, TerminalButton } from './ui';

interface TradeTableProps {
  trades: Trade[];
}

const PAGE_SIZE = 10;

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}

function formatPrice(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPnl(n: number) {
  const sign = n >= 0 ? '+' : '−';
  return (
    sign + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export default function TradeTable({ trades }: TradeTableProps) {
  const [page, setPage] = useState(1);
  const [sortDesc, setSortDesc] = useState(false);

  const sortedTrades = [...trades].sort((a, b) => {
    const diff = new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime();
    return sortDesc ? -diff : diff;
  });
  const totalPages = Math.ceil(sortedTrades.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const paginated = sortedTrades.slice(start, start + PAGE_SIZE);

  const initialCapital = 1_000_000;

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
    <div className="flex flex-col h-full overflow-hidden bg-dark-900">
      {/* Section header */}
      <SectionHeader
        title="Trade History"
        count={trades.length > 0 ? `${trades.length} trades` : undefined}
        right={
          <span className="text-[10px] text-muted">
            {trades.length > 0
              ? `${start + 1}–${Math.min(start + PAGE_SIZE, trades.length)} of ${trades.length}`
              : '0 trades'}
          </span>
        }
      />

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr>
              <th className="sticky top-0 bg-dark-800 text-left py-1.5 px-2 text-muted text-[10px] uppercase tracking-wider border-b border-dark-700">
                #
              </th>
              <th className="sticky top-0 bg-dark-800 text-left py-1.5 px-2 text-muted text-[10px] uppercase tracking-wider border-b border-dark-700">
                Type
              </th>
              <th className="sticky top-0 bg-dark-800 text-left py-1.5 px-2 text-muted text-[10px] uppercase tracking-wider border-b border-dark-700">
                <button
                  onClick={() => {
                    setSortDesc((d) => !d);
                    setPage(1);
                  }}
                  className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                >
                  Date / Time <span className="text-muted">{sortDesc ? '↓' : '↑'}</span>
                </button>
              </th>
              <th className="sticky top-0 bg-dark-800 text-left py-1.5 px-2 text-muted text-[10px] uppercase tracking-wider border-b border-dark-700">
                Signal
              </th>
              <th className="sticky top-0 bg-dark-800 text-right py-1.5 px-2 text-muted text-[10px] uppercase tracking-wider border-b border-dark-700">
                Price
              </th>
              <th className="sticky top-0 bg-dark-800 text-right py-1.5 px-2 text-muted text-[10px] uppercase tracking-wider border-b border-dark-700">
                Net P&amp;L
              </th>
              <th className="sticky top-0 bg-dark-800 text-right py-1.5 px-2 text-muted text-[10px] uppercase tracking-wider border-b border-dark-700">
                Cumulative P&amp;L
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((trade) => {
              const cum = cumPnlMap[trade.id] ?? 0;
              const cumPct = (cum / initialCapital) * 100;
              const pnlPct = (trade.pnl / initialCapital) * 100;
              const isLong = trade.side === 'long';
              const entrySignal = isLong ? 'Long' : 'Short';
              const exitSignal = isLong ? 'Long Exit' : 'Short Exit';
              const sideColor = isLong ? 'text-green' : 'text-red';

              return [
                <tr
                  key={`${trade.id}-entry`}
                  className="hover:bg-dark-700/30"
                  style={{ borderTop: '1px solid rgba(43,47,54,0.4)' }}
                >
                  <td
                    className="py-1.5 px-2 text-muted font-medium align-middle"
                    rowSpan={2}
                  >
                    {trade.id}
                  </td>
                  <td className="py-1.5 px-2 align-middle">
                    <Badge variant={isLong ? 'green' : 'red'} className="font-bold">Entry</Badge>
                  </td>
                  <td className="py-1.5 px-2 text-muted align-middle">{formatDate(trade.entryTime)}</td>
                  <td className={`py-1.5 px-2 font-medium align-middle ${sideColor}`}>
                    {entrySignal}
                  </td>
                  <td className="py-1.5 px-2 text-right text-gray-200 align-middle">
                    {formatPrice(trade.entryPrice)}
                  </td>
                  <td className="py-1.5 px-2 text-right text-muted align-middle">—</td>
                  <td className="py-1.5 px-2 text-right text-muted align-middle">—</td>
                </tr>,

                <tr
                  key={`${trade.id}-exit`}
                  className="hover:bg-dark-700/30"
                  style={{ borderBottom: '1px solid rgba(43,47,54,0.6)' }}
                >
                  <td className="py-1.5 px-2 align-middle">
                    <Badge variant="muted" className="font-bold">Exit</Badge>
                  </td>
                  <td className="py-1.5 px-2 text-muted align-middle">{formatDate(trade.exitTime)}</td>
                  <td
                    className={`py-1.5 px-2 font-medium align-middle ${
                      trade.isWin ? 'text-green' : 'text-red'
                    }`}
                  >
                    {exitSignal}
                  </td>
                  <td className="py-1.5 px-2 text-right text-gray-200 align-middle">
                    {formatPrice(trade.exitPrice)}
                  </td>
                  <td
                    className={`py-1.5 px-2 text-right font-semibold align-middle ${
                      trade.isWin ? 'text-green' : 'text-red'
                    }`}
                  >
                    <div>{formatPnl(trade.pnl)}</div>
                    <div className="text-[10px] opacity-70">
                      {pnlPct >= 0 ? '+' : ''}
                      {pnlPct.toFixed(2)}%
                    </div>
                  </td>
                  <td
                    className={`py-1.5 px-2 text-right font-semibold align-middle ${
                      cum >= 0 ? 'text-green' : 'text-red'
                    }`}
                  >
                    <div>{formatPnl(cum)}</div>
                    <div className="text-[10px] opacity-70">
                      {cumPct >= 0 ? '+' : ''}
                      {cumPct.toFixed(2)}%
                    </div>
                  </td>
                </tr>,
              ];
            })}
            {trades.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted text-xs">
                  No trades yet. Run a backtest to see results.
                </td>
              </tr>
            )}
          </tbody>
          {trades.length > 0 && (
            <tfoot>
              <tr className="border-t border-dark-700">
                <td colSpan={5} className="py-1.5 px-2 text-[10px] text-muted">
                  {winCount}W / {trades.length - winCount}L &middot; Fees: ${totalFees.toFixed(2)}
                </td>
                <td
                  colSpan={2}
                  className={`py-1.5 px-2 text-right font-semibold text-sm ${
                    totalPnl >= 0 ? 'text-green' : 'text-red'
                  }`}
                >
                  {formatPnl(totalPnl)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-dark-700 flex-shrink-0 bg-dark-800">
          <span className="text-[10px] text-muted">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, trades.length)} of {trades.length} trades
          </span>
          <div className="flex items-center gap-1">
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </TerminalButton>
            {getPageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`e-${i}`} className="px-1 text-muted text-[10px]">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-6 h-6 text-[10px] rounded font-mono transition-colors ${
                    page === p
                      ? 'bg-accent border border-accent text-dark-900 font-bold'
                      : 'bg-dark-700 border border-dark-700 text-muted hover:text-gray-200'
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next →
            </TerminalButton>
          </div>
        </div>
      )}
    </div>
  );
}
