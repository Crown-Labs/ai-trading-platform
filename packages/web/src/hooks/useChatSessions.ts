import { useState, useCallback, useEffect } from 'react';
import { BacktestRun } from '@ai-trading/shared';
import { ChatSession } from '../types/chat';

const STORAGE_KEY = 'ai-trading-sessions';

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => loadSessions()[0]?.id ?? null,
  );

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const createSession = useCallback(() => {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session;
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const updateSession = useCallback(
    (id: string, partial: Partial<ChatSession>) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          // Only overwrite keys that are explicitly provided (not undefined)
          const filtered = Object.fromEntries(
            Object.entries(partial).filter(([, v]) => v !== undefined),
          );
          const updated = { ...s, ...filtered };
          // Auto-title on first exchange (user + assistant)
          if (
            updated.messages.length === 2 &&
            s.title === 'New Chat' &&
            updated.messages[0].role === 'user'
          ) {
            const text = updated.messages[0].content;
            updated.title =
              text.length > 35 ? text.slice(0, 35) + '...' : text;
          }
          return updated;
        }),
      );
    },
    [],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setSessions((prev) => {
          setActiveSessionId(prev[0]?.id ?? null);
          return prev;
        });
      }
    },
    [activeSessionId],
  );

  const addBacktestRun = useCallback(
    (sessionId: string, run: BacktestRun) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const runs = [...(s.backtestRuns ?? []), run];
          return {
            ...s,
            backtestRuns: runs,
            activeRunId: run.id,
            backtestResult: run.result,
          };
        }),
      );
    },
    [],
  );

  const setActiveRun = useCallback(
    (sessionId: string, runId: string) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const run = s.backtestRuns?.find((r) => r.id === runId);
          if (!run) return s;
          return {
            ...s,
            activeRunId: runId,
            backtestResult: run.result,
            strategy: run.strategy,
          };
        }),
      );
    },
    [],
  );

  return {
    sessions,
    activeSession,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
    addBacktestRun,
    setActiveRun,
  };
}
