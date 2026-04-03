import { useState, useCallback, useEffect, useRef } from 'react';
import { BacktestRun } from '@ai-trading/shared';
import { ChatSession } from '../types/chat';
import { deleteRunsForSession } from '../lib/trade-store';
import { apiFetch } from '../lib/api';

/**
 * Server-backed chat sessions.
 * Sessions, messages, and backtest runs are persisted via the backend API.
 * Local state is kept in-memory for fast UI; server is source of truth.
 */
export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const loadedSessionIds = useRef<Set<string>>(new Set());

  // Load session list on mount
  useEffect(() => {
    apiFetch<any[]>('/api/chat/sessions')
      .then((list) => {
        const mapped: ChatSession[] = list.map((s) => ({
          id: s.id,
          title: s.title,
          createdAt: s.createdAt,
          messages: [],
          strategy: s.activeStrategy ?? undefined,
          activeRunId: s.activeRunId ?? undefined,
        }));
        setSessions(mapped);
        if (mapped.length > 0 && !activeSessionId) {
          setActiveSessionId(mapped[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Load full session data when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) return;
    if (loadedSessionIds.current.has(activeSessionId)) return;

    apiFetch<any>(`/api/chat/sessions/${activeSessionId}`)
      .then((full) => {
        loadedSessionIds.current.add(full.id);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== full.id) return s;
            return {
              ...s,
              messages: (full.messages ?? []).map((m: any) => ({
                role: m.role,
                content: m.content,
                strategy: m.strategy ?? undefined,
              })),
              strategy: full.activeStrategy ?? s.strategy,
              activeRunId: full.activeRunId ?? s.activeRunId,
              backtestRuns: (full.backtestRuns ?? []).map((r: any) => ({
                id: r.id,
                version: r.version,
                strategyName: r.strategyName,
                startDate: r.startDate,
                endDate: r.endDate,
                strategy: r.strategy,
                result: { metrics: r.metrics, trades: [] },
                createdAt: r.createdAt,
              })),
            };
          }),
        );
      })
      .catch(() => {});
  }, [activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const createSession = useCallback(() => {
    // Optimistic: create locally, then sync to server
    const tempId = crypto.randomUUID();
    const session: ChatSession = {
      id: tempId,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(tempId);

    // Sync to server and replace tempId with real id
    apiFetch<any>('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Chat' }),
    })
      .then((created) => {
        loadedSessionIds.current.add(created.id);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === tempId
              ? { ...s, id: created.id, createdAt: created.createdAt }
              : s,
          ),
        );
        setActiveSessionId((prev) => (prev === tempId ? created.id : prev));
      })
      .catch(() => {});

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
          const CLEARABLE_KEYS = ['activeRunId', 'backtestResult', 'candles', 'suggestedStrategy'];
          const filtered = Object.fromEntries(
            Object.entries(partial).filter(([k, v]) => v !== undefined || CLEARABLE_KEYS.includes(k)),
          );
          const updated = { ...s, ...filtered };
          // Auto-title on first exchange
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

      // Sync title, strategy, activeRunId to server
      const serverPatch: Record<string, any> = {};
      if (partial.title !== undefined) serverPatch.title = partial.title;
      if (partial.strategy !== undefined) serverPatch.activeStrategy = partial.strategy;
      if (partial.activeRunId !== undefined) serverPatch.activeRunId = partial.activeRunId;
      // Auto-title sync
      if (partial.messages && partial.messages.length === 2 && partial.messages[0].role === 'user') {
        const text = partial.messages[0].content;
        serverPatch.title = text.length > 35 ? text.slice(0, 35) + '...' : text;
      }

      if (Object.keys(serverPatch).length > 0) {
        apiFetch(`/api/chat/sessions/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(serverPatch),
        }).catch(() => {});
      }

      // Sync new messages to server
      if (partial.messages) {
        const currentSession = sessions.find((s) => s.id === id);
        const existingCount = currentSession?.messages.length ?? 0;
        const newMessages = partial.messages.slice(existingCount);
        for (const msg of newMessages) {
          apiFetch(`/api/chat/sessions/${id}/messages`, {
            method: 'POST',
            body: JSON.stringify({
              role: msg.role,
              content: msg.content,
              strategy: msg.strategy ?? undefined,
            }),
          }).catch(() => {});
        }
      }
    },
    [sessions],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const session = prev.find((s) => s.id === id);
        if (session?.backtestRuns?.length) {
          const runIds = session.backtestRuns.map((r) => r.id);
          deleteRunsForSession(runIds).catch(() => {});
        }

        const remaining = prev.filter((s) => s.id !== id);
        if (activeSessionId === id) {
          setActiveSessionId(remaining[0]?.id ?? null);
        }
        return remaining;
      });

      loadedSessionIds.current.delete(id);
      apiFetch(`/api/chat/sessions/${id}`, { method: 'DELETE' }).catch(() => {});
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

      // Sync to server
      apiFetch(`/api/chat/sessions/${sessionId}/runs`, {
        method: 'POST',
        body: JSON.stringify({
          version: run.version,
          strategyName: run.strategyName || run.strategy?.name || 'Unknown',
          startDate: run.startDate,
          endDate: run.endDate,
          strategy: run.strategy,
          metrics: run.result?.metrics ?? {},
        }),
      }).catch(() => {});
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

      apiFetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ activeRunId: runId }),
      }).catch(() => {});
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
