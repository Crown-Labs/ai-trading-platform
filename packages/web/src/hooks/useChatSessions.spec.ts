import { renderHook, act } from '@testing-library/react';
import { useChatSessions } from './useChatSessions';
import { ChatSession } from '../types/chat';

const STORAGE_KEY = 'ai-trading-sessions';

let store: Record<string, string> = {};

beforeEach(() => {
  store = {};
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(
    (key: string) => store[key] ?? null,
  );
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(
    (key: string, value: string) => {
      store[key] = value;
    },
  );

  let counter = 0;
  jest.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    counter += 1;
    return `00000000-0000-4000-8000-00000000000${counter}` as ReturnType<typeof crypto.randomUUID>;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function getSaved(): ChatSession[] {
  const raw = store[STORAGE_KEY];
  return raw ? JSON.parse(raw) : [];
}

/* ========================================================
   Issue #3 — Trading UI sessions
   ======================================================== */
describe('Issue #3 — Trading UI sessions', () => {
  it('createSession generates a unique id', () => {
    const { result } = renderHook(() => useChatSessions());

    let s1: ChatSession;
    let s2: ChatSession;
    act(() => { s1 = result.current.createSession(); });
    act(() => { s2 = result.current.createSession(); });

    expect(s1!.id).toBeDefined();
    expect(s2!.id).toBeDefined();
    expect(s1!.id).not.toBe(s2!.id);
    expect(result.current.sessions).toHaveLength(2);
  });

  it('selectSession changes the active session', () => {
    const { result } = renderHook(() => useChatSessions());

    let s1: ChatSession;
    let s2: ChatSession;
    act(() => { s1 = result.current.createSession(); });
    act(() => { s2 = result.current.createSession(); });

    expect(result.current.activeSession?.id).toBe(s2!.id);

    act(() => { result.current.selectSession(s1!.id); });

    expect(result.current.activeSession?.id).toBe(s1!.id);
  });

  it('updateSession updates session fields', () => {
    const { result } = renderHook(() => useChatSessions());

    let session: ChatSession;
    act(() => { session = result.current.createSession(); });

    act(() => {
      result.current.updateSession(session!.id, { title: 'Renamed' });
    });

    const updated = result.current.sessions.find((s) => s.id === session!.id);
    expect(updated?.title).toBe('Renamed');
  });

  it('deleteSession removes the session', () => {
    const { result } = renderHook(() => useChatSessions());

    let session: ChatSession;
    act(() => { session = result.current.createSession(); });
    expect(result.current.sessions).toHaveLength(1);

    act(() => { result.current.deleteSession(session!.id); });

    expect(result.current.sessions).toHaveLength(0);
    expect(result.current.activeSession).toBeNull();
  });
});

/* ========================================================
   Issue #8 — Multi-chat sessions
   ======================================================== */
describe('Issue #8 — Multi-chat sessions', () => {
  it('session ids follow UUID v4 format', () => {
    jest.spyOn(crypto, 'randomUUID').mockRestore();

    const { result } = renderHook(() => useChatSessions());
    let session: ChatSession;
    act(() => { session = result.current.createSession(); });

    const uuidV4Re =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(session!.id).toMatch(uuidV4Re);
  });

  it('sessions persist to localStorage', () => {
    const { result } = renderHook(() => useChatSessions());

    act(() => { result.current.createSession(); });

    const saved = getSaved();
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe('New Chat');
  });

  it('auto-title is capped when content exceeds 35 characters', () => {
    const { result } = renderHook(() => useChatSessions());

    let session: ChatSession;
    act(() => { session = result.current.createSession(); });

    const longMessage = 'A'.repeat(50);
    act(() => {
      result.current.updateSession(session!.id, {
        messages: [
          { role: 'user', content: longMessage },
          { role: 'assistant', content: 'reply' },
        ],
      });
    });

    const updated = result.current.sessions.find((s) => s.id === session!.id)!;
    expect(updated.title.length).toBeLessThanOrEqual(38);
    expect(updated.title).toBe('A'.repeat(35) + '...');
  });

  it('auto-title keeps short content as-is', () => {
    const { result } = renderHook(() => useChatSessions());

    let session: ChatSession;
    act(() => { session = result.current.createSession(); });

    act(() => {
      result.current.updateSession(session!.id, {
        messages: [
          { role: 'user', content: 'Buy BTC' },
          { role: 'assistant', content: 'Sure' },
        ],
      });
    });

    const updated = result.current.sessions.find((s) => s.id === session!.id)!;
    expect(updated.title).toBe('Buy BTC');
  });

  it('switching sessions restores the correct state', () => {
    const { result } = renderHook(() => useChatSessions());

    let s1: ChatSession;
    let s2: ChatSession;
    act(() => { s1 = result.current.createSession(); });
    act(() => {
      result.current.updateSession(s1!.id, {
        messages: [{ role: 'user', content: 'Hello from s1' }],
      });
    });
    act(() => { s2 = result.current.createSession(); });
    act(() => {
      result.current.updateSession(s2!.id, {
        messages: [{ role: 'user', content: 'Hello from s2' }],
      });
    });

    expect(result.current.activeSession?.id).toBe(s2!.id);
    expect(result.current.activeSession?.messages[0].content).toBe('Hello from s2');

    act(() => { result.current.selectSession(s1!.id); });
    expect(result.current.activeSession?.id).toBe(s1!.id);
    expect(result.current.activeSession?.messages[0].content).toBe('Hello from s1');

    act(() => { result.current.selectSession(s2!.id); });
    expect(result.current.activeSession?.id).toBe(s2!.id);
    expect(result.current.activeSession?.messages[0].content).toBe('Hello from s2');
  });

  it('loads sessions from localStorage on mount', () => {
    const seed: ChatSession[] = [
      {
        id: 'seed-1',
        title: 'Saved Chat',
        createdAt: new Date().toISOString(),
        messages: [{ role: 'user', content: 'persisted' }],
      },
    ];
    store[STORAGE_KEY] = JSON.stringify(seed);

    const { result } = renderHook(() => useChatSessions());

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].title).toBe('Saved Chat');
    expect(result.current.activeSession?.id).toBe('seed-1');
  });
});
