import { AiService } from './ai.service';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('Issue #4 — OpenClaw Chat integration', () => {
  let service: AiService;

  beforeEach(() => {
    service = new AiService();
    mockFetch.mockReset();
    // Set env vars
    process.env.OPENCLAW_GATEWAY_URL = 'http://test-gateway:18789';
    process.env.OPENCLAW_GATEWAY_TOKEN = 'test-token';
    process.env.OPENCLAW_AGENT_ID = 'trading-bot';
  });

  afterEach(() => {
    delete process.env.OPENCLAW_GATEWAY_URL;
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
    delete process.env.OPENCLAW_AGENT_ID;
  });

  function createMockResponse(ok: boolean, status = 200) {
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

  it('calls model openclaw:trading-bot', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(true));
    const res = createMockRes();

    await service.streamStrategyChat(
      [{ role: 'user', content: 'hello' }],
      res,
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://test-gateway:18789/v1/chat/completions');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('openclaw:trading-bot');
  });

  it('passes sessionId as user field', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(true));
    const res = createMockRes();

    await service.streamStrategyChat(
      [{ role: 'user', content: 'hello' }],
      res,
      'session-123',
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.user).toBe('session-123');
  });

  it('SSE headers set correctly', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(true));
    const res = createMockRes();

    await service.streamStrategyChat(
      [{ role: 'user', content: 'hello' }],
      res,
    );

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(res.flushHeaders).toHaveBeenCalled();
  });

  it('handles Gateway 502 gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: jest.fn().mockResolvedValue('Bad Gateway'),
    });

    const res = createMockRes();
    await service.streamStrategyChat(
      [{ role: 'user', content: 'hello' }],
      res,
    );

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Gateway error: 502',
      details: 'Bad Gateway',
    });
  });

  it('system prompt prepended', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(true));
    const res = createMockRes();

    await service.streamStrategyChat(
      [{ role: 'user', content: 'create a strategy' }],
      res,
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('AI Trading Platform');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe('create a strategy');
  });

  it('stream is true in request body', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(true));
    const res = createMockRes();

    await service.streamStrategyChat(
      [{ role: 'user', content: 'hello' }],
      res,
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stream).toBe(true);
  });
});

describe('Issue #7 — Shared package import', () => {
  it('@ai-trading/shared imports successfully in backend context', () => {
    const shared = require('@ai-trading/shared');
    expect(shared).toBeDefined();
    expect(shared.greeting).toBe('Hello from shared package');
  });
});
