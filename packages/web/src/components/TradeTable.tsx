import { useState } from 'react';
import { Trade } from '@ai-trading/shared';

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
    <div className="flex flex-col h-full overflow-hidden bg-terminal-surface">
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0 border-b border-terminal-border"
        style={{ padding: '9px 12px' }}
      >
        <span
          className="text-terminal-muted"
          style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}
        >
          Trade History
        </span>
        <span className="text-terminal-muted" style={{ fontSize: '10px' }}>
          {trades.length > 0
            ? `${start + 1}–${Math.min(start + PAGE_SIZE, trades.length)} / ${trades.length}`
            : '0 trades'}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr className="text-terminal-muted" style={{ borderBottom: '1px solid var(--border)' }}>
              <th
                className="text-left"
                style={{ padding: '6px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}
              >
                #
              </th>
              <th
                className="text-left"
                style={{ padding: '6px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}
              >
                Side
              </th>
              <th
                className="text-left"
                style={{ padding: '6px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}
              >
                <button
                  onClick={() => { setSortDesc((d) => !d); setPage(1); }}
                  className="flex items-center gap-1 text-terminal-muted transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = ''; }}
                >
                  Entry {sortDesc ? '↓' : '↑'}
                </button>
              </th>
              <th
                className="text-left"
                style={{ padding: '6px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}
              >
                Exit
              </th>
              <th
                className="text-right"
                style={{ padding: '6px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}
              >
                Entry P.
              </th>
              <th
                className="text-right"
                style={{ padding: '6px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}
              >
                Exit P.
              </th>
              <th
                className="text-right"
                style={{ padding: '6px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}
              >
                P&amp;L
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((trade) => {
              const pnlPct = (trade.pnl / initialCapital) * 100;
              const isLong = trade.side === 'long';

              return (
                <tr
                  key={trade.id}
                  style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                >
                  <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{trade.id}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '2px',
                        background: isLong ? 'rgba(3,166,109,0.15)' : 'rgba(207,48,74,0.15)',
                        color: isLong ? 'var(--green)' : 'var(--red)',
                      }}
                    >
                      {isLong ? 'LONG' : 'SHORT'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{formatDate(trade.entryTime)}</td>
                  <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{formatDate(trade.exitTime)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text)' }}>
                    {formatPrice(trade.entryPrice)}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text)' }}>
                    {formatPrice(trade.exitPrice)}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                    <div style={{ color: trade.isWin ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {formatPnl(trade.pnl)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </div>
                  </td>
                </tr>
              );
            })}
            {trades.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}
                >
                  No trades yet. Run a backtest to see results.
                </td>
              </tr>
            )}
          </tbody>
          {trades.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <td
                  colSpan={6}
                  style={{ padding: '6px 10px', fontSize: '10px', color: 'var(--muted)' }}
                >
                  {winCount}W / {trades.length - winCount}L · Fees: ${totalFees.toFixed(2)}
                </td>
                <td
                  style={{
                    padding: '6px 10px',
                    textAlign: 'right',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
                  }}
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
        <div
          className="flex items-center justify-center gap-1 flex-shrink-0 border-t border-terminal-border"
          style={{ padding: '6px 12px' }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-terminal-muted disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              padding: '2px 8px',
              fontSize: '10px',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: '3px',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontFamily: 'var(--font)',
            }}
          >
            ← Prev
          </button>
          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`e-${i}`} className="text-terminal-muted" style={{ padding: '0 4px', fontSize: '10px' }}>
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                style={{
                  width: '24px',
                  height: '24px',
                  fontSize: '10px',
                  background: page === p ? 'var(--accent)' : 'var(--surface2)',
                  color: page === p ? 'var(--bg)' : 'var(--muted)',
                  border: `1px solid ${page === p ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  fontWeight: page === p ? 700 : 400,
                }}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-terminal-muted disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              padding: '2px 8px',
              fontSize: '10px',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: '3px',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontFamily: 'var(--font)',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
