import { AiService } from './ai.service';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

function mockResponse(options: { ok?: boolean; status?: number; body?: any; text?: string } = {}) {
  const { ok = true, status = 200, body = null, text = '' } = options;

  const mockReader = {
    read: jest.fn()
      .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}') })
      .mockResolvedValueOnce({ done: true, value: undefined }),
  };

  return {
    ok,
    status,
    text: jest.fn().mockResolvedValue(text),
    body: body !== null ? body : { getReader: () => mockReader },
  } as unknown as Response;
}

describe('AiService', () => {
  let service: AiService;
  let mockRes: any;

  beforeEach(() => {
    service = new AiService();
    mockFetch.mockReset();

    // Mock Express Response
    mockRes = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Set env vars for test
    process.env.OPENCLAW_GATEWAY_URL = 'http://test-gateway:18789';
    process.env.OPENCLAW_GATEWAY_TOKEN = 'test-token-123';
    process.env.OPENCLAW_AGENT_ID = 'test-agent';
  });

  afterEach(() => {
    delete process.env.OPENCLAW_GATEWAY_URL;
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
    delete process.env.OPENCLAW_AGENT_ID;
  });

  describe('streamStrategyChat()', () => {
    it('should call OpenClaw API with correct headers', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse());

      const messages = [{ role: 'user' as const, content: 'Create a BTC strategy' }];
      await service.streamStrategyChat(messages, mockRes);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://test-gateway:18789/v1/chat/completions');
      expect((options as any).method).toBe('POST');
      expect((options as any).headers['Content-Type']).toBe('application/json');
      expect((options as any).headers['Authorization']).toBe('Bearer test-token-123');
    });

    it('should pass messages correctly with system prompt prepended', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse());

      const messages = [
        { role: 'user' as const, content: 'Build me a mean reversion strategy' },
      ];
      await service.streamStrategyChat(messages, mockRes);

      const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(body.model).toBe('test-agent');
      expect(body.stream).toBe(true);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toBe('Build me a mean reversion strategy');
    });

    it('should set SSE headers on success', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse());

      await service.streamStrategyChat(
        [{ role: 'user', content: 'test' }],
        mockRes,
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.flushHeaders).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ ok: false, status: 500, text: 'Internal Server Error', body: undefined }),
      );

      await service.streamStrategyChat(
        [{ role: 'user', content: 'test' }],
        mockRes,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Gateway error: 500',
        }),
      );
    });

    it('should pass sessionId as user field when provided', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse());

      await service.streamStrategyChat(
        [{ role: 'user', content: 'test' }],
        mockRes,
        'session-abc',
      );

      const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(body.user).toBe('session-abc');
    });

    it('should handle missing response body', async () => {
      const noBodyResponse = {
        ok: true,
        status: 200,
        body: null,
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
      } as unknown as Response;
      mockFetch.mockResolvedValueOnce(noBodyResponse);

      await service.streamStrategyChat(
        [{ role: 'user', content: 'test' }],
        mockRes,
      );

      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
