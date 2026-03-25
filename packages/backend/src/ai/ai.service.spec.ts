import { AiService } from './ai.service';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('Issue #4 — OpenClaw Chat integration', () => {
  let service: AiService;

  beforeEach(() => {
    service = new AiService();
    mockFetch.mockReset();
    process.env.OPENCLAW_GATEWAY_URL = 'http://test-gateway:18789';
    process.env.OPENCLAW_GATEWAY_TOKEN = 'test-token';
    process.env.OPENCLAW_AGENT_ID = 'trading-bot';
  });

  afterEach(() => {
    delete process.env.OPENCLAW_GATEWAY_URL;
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
    delete process.env.OPENCLAW_AGENT_ID;
  });

  function createMockStreamResponse(ok: boolean, status = 200) {
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}') })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    return {
      ok,
      status,
      text: jest.fn().mockResolvedValue('error text'),
      body: { getReader: () => mockReader },
    };
  }

  function createMockRes() {
    return {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
  }

  // AC: model is openclaw:<agentId>
  it('calls model openclaw:trading-bot', async () => {
    mockFetch.mockResolvedValueOnce(createMockStreamResponse(true));
    await service.streamStrategyChat([{ role: 'user', content: 'hello' }], createMockRes());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('openclaw:trading-bot');
  });

  // AC: sessionId passed as user field for isolated context per session
  it('passes sessionId as user field for session isolation', async () => {
    mockFetch.mockResolvedValueOnce(createMockStreamResponse(true));
    await service.streamStrategyChat([{ role: 'user', content: 'hello' }], createMockRes(), 'session-abc');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.user).toBe('session-abc');
  });

  // AC: no user field when sessionId is omitted
  it('omits user field when no sessionId provided', async () => {
    mockFetch.mockResolvedValueOnce(createMockStreamResponse(true));
    await service.streamStrategyChat([{ role: 'user', content: 'hello' }], createMockRes());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.user).toBeUndefined();
  });

  // AC: SSE headers set correctly for real-time streaming
  it('sets SSE headers correctly', async () => {
    mockFetch.mockResolvedValueOnce(createMockStreamResponse(true));
    const res = createMockRes();
    await service.streamStrategyChat([{ role: 'user', content: 'hello' }], res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(res.flushHeaders).toHaveBeenCalled();
  });

  // AC: stream: true in request body
  it('sends stream: true in request body', async () => {
    mockFetch.mockResolvedValueOnce(createMockStreamResponse(true));
    await service.streamStrategyChat([{ role: 'user', content: 'hello' }], createMockRes());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stream).toBe(true);
  });

  // AC: system prompt prepended to every request
  it('prepends system prompt as first message', async () => {
    mockFetch.mockResolvedValueOnce(createMockStreamResponse(true));
    await service.streamStrategyChat([{ role: 'user', content: 'create a strategy' }], createMockRes());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('AI Trading Platform');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe('create a strategy');
  });

  // AC: Gateway 502 returns structured error, does not crash
  it('handles Gateway 502 gracefully without crashing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: jest.fn().mockResolvedValue('Bad Gateway'),
    });
    const res = createMockRes();
    await service.streamStrategyChat([{ role: 'user', content: 'hello' }], res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Gateway error: 502', details: 'Bad Gateway' });
  });

  // AC: different sessions get isolated context via different user fields
  it('sends different user fields for different sessions', async () => {
    mockFetch.mockResolvedValue(createMockStreamResponse(true));
    const res = createMockRes();

    await service.streamStrategyChat([{ role: 'user', content: 'hi' }], res, 'session-1');
    await service.streamStrategyChat([{ role: 'user', content: 'hi' }], res, 'session-2');

    const body1 = JSON.parse(mockFetch.mock.calls[0][1].body);
    const body2 = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body1.user).toBe('session-1');
    expect(body2.user).toBe('session-2');
    expect(body1.user).not.toBe(body2.user);
  });
});

describe('Issue #7 — Shared package import', () => {
  it('@ai-trading/shared imports successfully in backend context', () => {
    const shared = require('@ai-trading/shared');
    expect(shared).toBeDefined();
    expect(shared.greeting).toBe('Hello from shared package');
  });
});
