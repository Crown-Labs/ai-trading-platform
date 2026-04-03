import { API_BASE } from './api';

const STORAGE_KEY = 'ai-trading-sessions';
const MIGRATED_KEY = 'ai-trading-migrated';

/**
 * Migrate localStorage sessions to the server on first login.
 * Runs once, then sets a flag so it doesn't repeat.
 */
export async function migrateLocalData(token: string): Promise<void> {
  if (localStorage.getItem(MIGRATED_KEY)) return;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATED_KEY, '1');
    return;
  }

  let sessions: any[];
  try {
    sessions = JSON.parse(raw);
  } catch {
    localStorage.setItem(MIGRATED_KEY, '1');
    return;
  }

  if (!Array.isArray(sessions) || sessions.length === 0) {
    localStorage.setItem(MIGRATED_KEY, '1');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  for (const session of sessions) {
    try {
      // Create server session
      const createRes = await fetch(`${API_BASE}/api/chat/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: session.title || 'New Chat' }),
      });
      if (!createRes.ok) continue;
      const created = await createRes.json();

      // Upload messages
      if (Array.isArray(session.messages)) {
        for (const msg of session.messages) {
          await fetch(`${API_BASE}/api/chat/sessions/${created.id}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              role: msg.role,
              content: msg.content,
              strategy: msg.strategy ?? undefined,
            }),
          });
        }
      }

      // Upload active strategy
      if (session.strategy) {
        await fetch(`${API_BASE}/api/chat/sessions/${created.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ activeStrategy: session.strategy }),
        });
      }

      // Upload backtest runs
      if (Array.isArray(session.backtestRuns)) {
        for (const run of session.backtestRuns) {
          await fetch(
            `${API_BASE}/api/chat/sessions/${created.id}/runs`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                version: run.version,
                strategyName: run.strategyName || run.strategy?.name || 'Unknown',
                startDate: run.startDate,
                endDate: run.endDate,
                strategy: run.strategy,
                metrics: run.result?.metrics ?? {},
              }),
            },
          );
        }
      }
    } catch {
      // Skip failed sessions
    }
  }

  // Mark migration complete and clear old data
  localStorage.setItem(MIGRATED_KEY, '1');
  localStorage.removeItem(STORAGE_KEY);
}
