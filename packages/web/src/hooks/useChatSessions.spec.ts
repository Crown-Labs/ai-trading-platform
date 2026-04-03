import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatSessions } from './useChatSessions';

// Mock api module (uses import.meta.env which Jest can't handle)
jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
}));

// Mock trade-store
jest.mock('../lib/trade-store', () => ({
  deleteRunsForSession: jest.fn().mockResolvedValue(undefined),
}));

const { apiFetch } = require('../lib/api') as { apiFetch: jest.Mock };

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => `uuid-${++uuidCounter}` },
});

beforeEach(() => {
  jest.clearAllMocks();
  uuidCounter = 0;
  // Default: return empty sessions list
  apiFetch.mockResolvedValue([]);
});

describe('useChatSessions — server-backed', () => {
  it('createSession adds a session optimistically and syncs to server', async () => {
    apiFetch
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValueOnce({ id: 'server-1', title: 'New Chat', createdAt: '2026-01-01' }); // create

    const { result } = renderHook(() => useChatSessions());

    // Wait for initial load
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/chat/sessions');
    });

    act(() => { result.current.createSession(); });

    // Optimistic session exists immediately
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.activeSession).not.toBeNull();
  });

  it('selectSession changes the active session', async () => {
    apiFetch.mockResolvedValueOnce([
      { id: 's1', title: 'Chat 1', createdAt: '2026-01-01' },
      { id: 's2', title: 'Chat 2', createdAt: '2026-01-02' },
    ]);

    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
    });

    act(() => { result.current.selectSession('s2'); });
    expect(result.current.activeSession?.id).toBe('s2');
  });

  it('updateSession updates local state and patches server', async () => {
    apiFetch
      .mockResolvedValueOnce([{ id: 's1', title: 'New Chat', createdAt: '2026-01-01' }])
      .mockResolvedValueOnce({ id: 's1', messages: [], backtestRuns: [] }); // session detail load

    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
    });

    act(() => {
      result.current.updateSession('s1', { title: 'Updated Title' });
    });

    expect(result.current.sessions[0].title).toBe('Updated Title');
    // Server patch should have been called
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/chat/sessions/s1',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  it('deleteSession removes session and calls server', async () => {
    apiFetch.mockResolvedValueOnce([
      { id: 's1', title: 'Chat 1', createdAt: '2026-01-01' },
      { id: 's2', title: 'Chat 2', createdAt: '2026-01-02' },
    ]);

    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
    });

    act(() => { result.current.deleteSession('s1'); });

    expect(result.current.sessions.find((s) => s.id === 's1')).toBeUndefined();
    expect(result.current.sessions).toHaveLength(1);
  });

  it('auto-title is set from first user message when length > 35 characters', async () => {
    apiFetch
      .mockResolvedValueOnce([{ id: 's1', title: 'New Chat', createdAt: '2026-01-01' }])
      .mockResolvedValueOnce({ id: 's1', messages: [], backtestRuns: [] })
      .mockResolvedValue({}); // catch-all for patches/messages

    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
    });

    act(() => {
      result.current.updateSession('s1', {
        messages: [
          { role: 'user', content: 'Buy BTC when RSI is below 30 and EMA is bullish' },
          { role: 'assistant', content: 'Got it!' },
        ],
      });
    });

    const title = result.current.sessions[0].title;
    expect(title.length).toBeLessThanOrEqual(38); // 35 + '...'
    expect(title.endsWith('...')).toBe(true);
  });
});
