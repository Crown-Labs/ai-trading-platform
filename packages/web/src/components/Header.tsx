import { useState } from 'react';
import { ChatSession } from '../types/chat';
import { BacktestRun } from '@ai-trading/shared';

interface HeaderProps {
  activeSession?: ChatSession | null;
  activeRun?: BacktestRun | null;
}

export default function Header({ activeSession, activeRun }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const latestReturn = activeRun?.result?.metrics?.totalReturn;
  const returnColor =
    latestReturn == null
      ? 'text-terminal-muted'
      : latestReturn >= 0
      ? 'text-terminal-green font-bold'
      : 'text-terminal-red font-bold';
  const returnLabel =
    latestReturn != null
      ? `${latestReturn >= 0 ? '+' : ''}${latestReturn.toFixed(1)}%`
      : null;

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between bg-terminal-surface border-b border-terminal-border px-4"
      style={{ height: '48px', zIndex: 100 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 font-bold text-terminal-accent" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>
        <div
          className="flex items-center justify-center bg-terminal-accent text-terminal-bg font-black rounded"
          style={{ width: '24px', height: '24px', fontSize: '12px' }}
        >
          ⚡
        </div>
        AlgoEdge
      </div>

      {/* Session info chips */}
      <div className="flex items-center gap-1.5" style={{ fontSize: '11px' }}>
        {activeSession ? (
          <>
            <span className="text-terminal-text font-bold" style={{ letterSpacing: '-0.01em' }}>
              {activeSession.title}
            </span>
            <span className="text-terminal-border" style={{ fontSize: '14px' }}>·</span>
            {activeSession.strategy?.market?.symbol && (
              <div
                className="flex items-center gap-1 bg-terminal-surface2 border border-terminal-border rounded text-terminal-muted"
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                <span className="text-terminal-accent font-semibold">
                  {activeSession.strategy.market.symbol}
                </span>
              </div>
            )}
            {activeSession.strategy?.market?.timeframe && (
              <div
                className="flex items-center gap-1 bg-terminal-surface2 border border-terminal-border rounded text-terminal-muted"
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                <span className="text-terminal-accent font-semibold">
                  {activeSession.strategy.market.timeframe}
                </span>
              </div>
            )}
            {activeRun && (
              <div
                className="flex items-center gap-1 bg-terminal-surface2 border border-terminal-border rounded text-terminal-muted"
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                v{activeRun.version}{' '}
                <span className="text-terminal-accent font-semibold">latest</span>
              </div>
            )}
            {returnLabel && (
              <div
                className="flex items-center bg-terminal-surface2 border border-terminal-border rounded text-terminal-muted"
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                <span className={returnColor}>{returnLabel}</span>
              </div>
            )}
            {activeRun && (
              <div
                className="flex items-center bg-terminal-surface2 border border-terminal-border rounded text-terminal-muted"
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                {activeRun.result?.metrics?.totalTrades ?? 0} trades
              </div>
            )}
          </>
        ) : (
          <span className="text-terminal-muted">No active session</span>
        )}
      </div>

      {/* Right side: status + bell + profile */}
      <div className="flex items-center gap-2.5">
        {/* Connected status */}
        <div className="flex items-center gap-1.5 text-terminal-green" style={{ fontSize: '11px' }}>
          <span className="status-dot" />
          Connected
        </div>

        {/* Notification bell */}
        <button
          className="relative flex items-center justify-center rounded-full border border-terminal-border text-terminal-muted transition-colors"
          style={{ width: '30px', height: '30px', fontSize: '13px', background: 'transparent', cursor: 'pointer' }}
          title="Notifications"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
          }}
        >
          🔔
          <span
            className="absolute bg-terminal-accent border border-terminal-bg rounded-full"
            style={{ width: '6px', height: '6px', top: '4px', right: '4px' }}
          />
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 border border-terminal-border rounded transition-colors"
            style={{ padding: '4px 8px 4px 4px', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,185,11,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <div
              className="flex items-center justify-center rounded text-terminal-bg font-black flex-shrink-0"
              style={{
                width: '26px',
                height: '26px',
                background: 'linear-gradient(135deg,#f0b90b,#e8a008)',
                fontSize: '11px',
                borderRadius: '5px',
              }}
            >
              JI
            </div>
            <span className="text-terminal-text font-semibold" style={{ fontSize: '11px' }}>
              Jacob
            </span>
            <span className="text-terminal-muted" style={{ fontSize: '9px' }}>▾</span>
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 bg-terminal-surface border border-terminal-border rounded overflow-hidden"
              style={{ top: 'calc(100% + 6px)', minWidth: '180px', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
            >
              <div className="border-b border-terminal-border" style={{ padding: '10px 12px' }}>
                <div className="text-terminal-text font-bold" style={{ fontSize: '12px' }}>Jacob Isack</div>
                <div className="text-terminal-muted" style={{ fontSize: '10px', marginTop: '1px' }}>jacob@example.com</div>
              </div>
              {[
                { icon: '👤', label: 'Profile' },
                { icon: '⚙️', label: 'Settings' },
                { icon: '🔑', label: 'API Keys' },
                { icon: '📊', label: 'Usage' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-terminal-muted cursor-pointer transition-colors"
                  style={{ padding: '8px 12px', fontSize: '12px' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)';
                    (e.currentTarget as HTMLDivElement).style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = '';
                    (e.currentTarget as HTMLDivElement).style.color = '';
                  }}
                >
                  {item.icon}&nbsp;&nbsp;{item.label}
                </div>
              ))}
              <div className="border-t border-terminal-border" />
              <div
                className="flex items-center gap-2 cursor-pointer transition-colors"
                style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--red)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(207,48,74,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = '';
                }}
              >
                ⏻&nbsp;&nbsp;Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
