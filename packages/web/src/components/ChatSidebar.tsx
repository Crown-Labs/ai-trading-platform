import { useState } from 'react';
import { ChatSession } from '../types/chat';
import ConfirmDialog from './ConfirmDialog';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  if (date >= today) {
    return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date >= yesterday) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onDelete,
}: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingSession = sessions.find((s) => s.id === pendingDeleteId);

  return (
    <div
      className="flex-shrink-0 flex flex-col h-full bg-terminal-surface border-r border-terminal-border overflow-hidden transition-all duration-200"
      style={{ width: collapsed ? '44px' : '190px' }}
    >
      {/* Top: toggle + new chat */}
      <div className="flex flex-col gap-1.5 border-b border-terminal-border" style={{ padding: '8px 6px 6px' }}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center border border-terminal-border text-terminal-muted transition-colors self-start flex-shrink-0"
          style={{ width: '32px', height: '28px', background: 'transparent', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
          title="Toggle sidebar"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
          }}
        >
          {collapsed ? '▶' : '◀'}
        </button>

        {!collapsed && (
          <div className="text-terminal-muted" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Sessions
          </div>
        )}

        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 bg-terminal-accent text-terminal-bg font-bold transition-opacity"
          style={{
            borderRadius: '4px',
            fontSize: '11px',
            padding: collapsed ? '6px' : '6px 8px',
            letterSpacing: '0.04em',
            border: 'none',
            cursor: 'pointer',
            width: collapsed ? '32px' : '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          <span style={{ flexShrink: 0 }}>＋</span>
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ padding: '4px 5px 8px' }}>
        {sessions.length === 0 && !collapsed && (
          <p className="text-terminal-muted text-center" style={{ fontSize: '11px', padding: '12px 4px' }}>
            No chats yet
          </p>
        )}
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const runs = session.backtestRuns ?? [];
          const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;
          const latestReturn = latestRun?.result?.metrics?.totalReturn;

          return (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className="flex items-center gap-1.5 cursor-pointer mb-px rounded"
              style={{
                padding: isActive ? '7px 6px 7px 4px' : '7px 6px',
                background: isActive ? 'var(--surface2)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
              title={session.title}
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center flex-shrink-0 border"
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '4px',
                  background: isActive ? 'rgba(240,185,11,0.15)' : 'var(--surface2)',
                  borderColor: isActive ? 'rgba(240,185,11,0.3)' : 'var(--border)',
                  fontSize: '10px',
                }}
              >
                📈
              </div>

              {/* Info (hidden when collapsed) */}
              {!collapsed && (
                <div className="flex-1 overflow-hidden">
                  <div
                    className="text-terminal-text font-medium truncate"
                    style={{ fontSize: '11px' }}
                  >
                    {session.title}
                  </div>
                  <div
                    className="flex justify-between text-terminal-muted"
                    style={{ fontSize: '10px', marginTop: '1px' }}
                  >
                    <span>
                      {formatDate(session.createdAt)}
                      {runs.length > 0 && ` · ${runs.length} run${runs.length !== 1 ? 's' : ''}`}
                    </span>
                    {latestReturn != null && (
                      <span
                        style={{
                          color: latestReturn >= 0 ? 'var(--green)' : 'var(--red)',
                          fontWeight: 600,
                        }}
                      >
                        {latestReturn >= 0 ? '+' : ''}
                        {latestReturn.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Delete button (only when expanded) */}
              {!collapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDeleteId(session.id);
                  }}
                  className="ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 text-terminal-muted transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '11px' }}
                  title="Delete chat"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm delete dialog */}
      {pendingDeleteId && pendingSession && (
        <ConfirmDialog
          title="Delete chat?"
          message={`"${pendingSession.title}" and all its backtest history will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={() => {
            onDelete(pendingDeleteId);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}
