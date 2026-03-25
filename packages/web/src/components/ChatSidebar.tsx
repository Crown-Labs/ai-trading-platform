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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingSession = sessions.find((s) => s.id === pendingDeleteId);

  return (
    <div className="flex flex-col h-full">
      <button onClick={onCreate} className="btn-primary w-full mb-4 text-sm">
        + New Chat
      </button>

      <div className="flex-grow overflow-y-auto space-y-1">
        {sessions.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            No chats yet
          </p>
        )}
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                isActive
                  ? 'bg-primary-600/20 border border-primary-500/40 text-white'
                  : 'text-gray-400 hover:bg-dark-700 hover:text-gray-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{session.title}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(session.createdAt)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDeleteId(session.id);
                }}
                className="ml-2 p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="Delete chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom confirm dialog */}
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
