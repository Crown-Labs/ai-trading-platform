import { ChatSession } from '../types/chat';
import { BacktestRun } from '@ai-trading/shared';
import { Badge } from './ui';

interface HeaderProps {
  user: { name?: string; picture?: string; email: string };
  onLogout: () => void;
  activeSession?: ChatSession | null;
  activeRun?: BacktestRun | null;
}

export default function Header({ user, onLogout, activeSession, activeRun }: HeaderProps) {
  const strategy = activeRun?.strategy ?? activeSession?.strategy ?? null;
  const metrics = activeRun?.result?.metrics ?? activeSession?.backtestResult?.metrics ?? null;
  const displayName = user.name || user.email;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="h-12 bg-dark-800 border-b border-dark-700 flex items-center px-4 gap-3 flex-shrink-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 font-bold text-sm text-accent flex-shrink-0">
        <div className="w-7 h-7 bg-accent rounded flex items-center justify-center text-dark-900 font-black text-xs">
          ⚡
        </div>
        AlgoEdge
      </div>

      {/* Center chips */}
      <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap overflow-hidden">
        {activeSession && (
          <>
            <Badge variant="muted" className="text-[11px] px-2 py-0.5">
              Session <span className="text-gray-200 font-semibold">{activeSession.title}</span>
            </Badge>
            {strategy && (
              <>
                <Badge variant="muted" className="text-[11px] px-2 py-0.5">
                  <span className="text-accent font-bold">{strategy.market.symbol}</span>
                </Badge>
                <Badge variant="muted" className="text-[11px] px-2 py-0.5">
                  <span className="text-gray-200 font-semibold">{strategy.market.timeframe}</span>
                </Badge>
              </>
            )}
            {activeRun && (
              <Badge variant="muted" className="text-[11px] px-2 py-0.5">
                v{activeRun.version} <span className="text-accent font-bold">latest</span>
              </Badge>
            )}
            {metrics && (
              <Badge
                variant={metrics.totalReturn >= 0 ? 'green' : 'red'}
                className="text-[11px] px-2 py-0.5 font-bold"
              >
                {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(1)}%
              </Badge>
            )}
            {metrics && (
              <Badge variant="muted" className="text-[11px] px-2 py-0.5">
                {metrics.totalTrades} trades
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Right: status + user */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-green">
          <div className="w-1.5 h-1.5 rounded-full bg-green flex-shrink-0" />
          Live
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 bg-transparent border border-dark-700 rounded px-2 py-1 cursor-pointer text-gray-200 hover:border-muted transition-colors"
        >
          {user.picture ? (
            <img
              src={user.picture}
              alt={displayName}
              className="w-6 h-6 rounded"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-[10px] font-black text-dark-900">
              {initials}
            </div>
          )}
          <span className="text-[11px]">{user.name?.split(' ')[0] || user.email.split('@')[0]}</span>
        </button>
      </div>
    </header>
  );
}
