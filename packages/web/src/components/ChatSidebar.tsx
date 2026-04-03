import { useState } from 'react';
import { ChatSession } from '../types/chat';
import ConfirmDialog from './ConfirmDialog';
import { Badge } from './ui';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
  collapsed = false,
  onToggleCollapse,
}: ChatSidebarProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingSession = sessions.find((s) => s.id === pendingDeleteId);

  return (
    <div className="flex flex-col h-full bg-dark-800 border-r border-dark-700 overflow-hidden">
      {/* Top controls */}
      <div className="flex flex-col gap-1.5 p-1.5 border-b border-dark-700 flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-7 bg-transparent border border-dark-700 rounded text-muted cursor-pointer text-[11px] flex items-center justify-center hover:text-gray-200 transition-colors"
        >
          {collapsed ? '▶' : '◀'}
        </button>
        {!collapsed && (
          <div className="text-[9px] text-muted uppercase tracking-widest px-1">Sessions</div>
        )}
        <button
          onClick={onCreate}
          className="bg-accent border-none rounded text-dark-900 text-[11px] font-bold cursor-pointer font-mono flex items-center gap-1.5 overflow-hidden whitespace-nowrap transition-opacity hover:opacity-90"
          style={{
            padding: collapsed ? '6px' : '6px 8px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          ＋{!collapsed && <span> New Chat</span>}
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {sessions.length === 0 && !collapsed && (
          <p className="text-muted text-[11px] text-center py-4">No chats yet</p>
        )}
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const activeRun = session.backtestRuns?.find((r) => r.id === session.activeRunId);
          const returnPct =
            activeRun?.result?.metrics?.totalReturn ??
            session.backtestResult?.metrics?.totalReturn ??
            null;
          const runCount = session.backtestRuns?.length ?? 0;

          return (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`group flex items-center gap-1.5 py-1.5 px-1.5 rounded cursor-pointer mb-0.5 transition-colors ${
                isActive
                  ? 'bg-dark-700 border-l-2 border-accent'
                  : 'hover:bg-dark-700'
              }`}
              style={{ paddingLeft: isActive ? '4px' : '6px' }}
            >
              {/* Session icon */}
              <div className="w-5 h-5 rounded bg-dark-700 border border-dark-700 flex items-center justify-center text-[10px] flex-shrink-0">
                📈
              </div>

              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-[11px] font-medium truncate text-gray-200">
                      {session.title}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted mt-0.5">
                      <span>
                        {runCount > 0
                          ? `${runCount} run${runCount > 1 ? 's' : ''}`
                          : formatDate(session.createdAt)}
                      </span>
                      {returnPct != null && (
                        <Badge variant={returnPct >= 0 ? 'green' : 'red'} size="xs" className="font-semibold">
                          {returnPct >= 0 ? '+' : ''}
                          {returnPct.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteId(session.id);
                    }}
                    className="ml-1 p-0.5 rounded text-muted hover:text-red opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Delete chat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

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
