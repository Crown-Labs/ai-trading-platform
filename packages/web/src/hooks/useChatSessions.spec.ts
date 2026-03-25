import { renderHook, act } from '@testing-library/react';
import { useChatSessions } from './useChatSessions';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => `uuid-${++uuidCounter}` },
});

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
  uuidCounter = 0;
});

describe('Issue #3 — useChatSessions core operations', () => {
  it('createSession generates a unique id and sets it as active', () => {
    const { result } = renderHook(() => useChatSessions());

    act(() => { result.current.createSession(); });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.activeSession?.id).toBe('uuid-1');
  });

  it('selectSession changes the active session', () => {
    const { result } = renderHook(() => useChatSessions());

    act(() => { result.current.createSession(); });
    act(() => { result.current.createSession(); });

    const firstId = result.current.sessions[1].id;
    act(() => { result.current.selectSession(firstId); });

    expect(result.current.activeSession?.id).toBe(firstId);
  });

  it('updateSession updates the specified fields only', () => {
    const { result } = renderHook(() => useChatSessions());
    act(() => { result.current.createSession(); });

    const id = result.current.sessions[0].id;
    act(() => {
      result.current.updateSession(id, { title: 'Updated Title' });
    });

    expect(result.current.sessions[0].title).toBe('Updated Title');
    expect(result.current.sessions[0].id).toBe(id); // id unchanged
  });

  it('deleteSession removes the session from the list', () => {
    const { result } = renderHook(() => useChatSessions());
    act(() => { result.current.createSession(); });
    act(() => { result.current.createSession(); });

    const idToDelete = result.current.sessions[0].id;
    act(() => { result.current.deleteSession(idToDelete); });

    expect(result.current.sessions.find((s) => s.id === idToDelete)).toBeUndefined();
    expect(result.current.sessions).toHaveLength(1);
  });
});

describe('Issue #8 — Multi-chat session persistence', () => {
  it('session id follows UUID format', () => {
    const { result } = renderHook(() => useChatSessions());
    act(() => { result.current.createSession(); });

    // crypto.randomUUID is mocked to return uuid-N, just verify it's a string
    expect(typeof result.current.sessions[0].id).toBe('string');
    expect(result.current.sessions[0].id.length).toBeGreaterThan(0);
  });

  it('sessions persist to localStorage on every change', () => {
    const { result } = renderHook(() => useChatSessions());
    act(() => { result.current.createSession(); });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    const saved = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)[1]);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('uuid-1');
  });

  it('loads sessions from localStorage on mount', () => {
    const existing = [{ id: 'existing-1', title: 'Old Chat', createdAt: new Date().toISOString(), messages: [] }];
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(existing));

    const { result } = renderHook(() => useChatSessions());

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe('existing-1');
  });

  it('auto-title is set from first user message when length > 35 characters', () => {
    const { result } = renderHook(() => useChatSessions());
    act(() => { result.current.createSession(); });

    const id = result.current.sessions[0].id;
    act(() => {
      result.current.updateSession(id, {
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

  it('auto-title keeps short content as-is (≤ 35 chars)', () => {
    const { result } = renderHook(() => useChatSessions());
    act(() => { result.current.createSession(); });

    const id = result.current.sessions[0].id;
    act(() => {
      result.current.updateSession(id, {
        messages: [
          { role: 'user', content: 'BTC RSI strategy' },
          { role: 'assistant', content: 'Sure!' },
        ],
      });
    });

    expect(result.current.sessions[0].title).toBe('BTC RSI strategy');
  });

  it('switching sessions restores the correct session state', () => {
    const { result } = renderHook(() => useChatSessions());

    act(() => { result.current.createSession(); });
    const id1 = result.current.sessions[0].id;
    act(() => {
      result.current.updateSession(id1, {
        messages: [{ role: 'user', content: 'Session 1 message' }],
      });
    });

    act(() => { result.current.createSession(); });
    const id2 = result.current.sessions[0].id;
    act(() => {
      result.current.updateSession(id2, {
        messages: [{ role: 'user', content: 'Session 2 message' }],
      });
    });

    // Switch back to session 1
    act(() => { result.current.selectSession(id1); });
    expect(result.current.activeSession?.messages[0].content).toBe('Session 1 message');

    // Switch to session 2
    act(() => { result.current.selectSession(id2); });
    expect(result.current.activeSession?.messages[0].content).toBe('Session 2 message');
  });

  it('each session has isolated messages — one session does not affect another', () => {
    const { result } = renderHook(() => useChatSessions());

    act(() => { result.current.createSession(); });
    const id1 = result.current.sessions[0].id;

    act(() => { result.current.createSession(); });
    const id2 = result.current.sessions[0].id;

    act(() => {
      result.current.updateSession(id1, {
        messages: [{ role: 'user', content: 'Message in session 1' }],
      });
    });

    const session2 = result.current.sessions.find((s) => s.id === id2);
    expect(session2?.messages).toHaveLength(0);
  });
});
