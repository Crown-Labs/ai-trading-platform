import { BadRequestException } from '@nestjs/common';
import { StrategyService } from './strategy.service';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

const VALID_YAML = `
strategy:
  name: rsi_test
market:
  exchange: binance
  symbol: BTCUSDT
  timeframe: 1h
indicator:
  rsi: 14
entry:
  condition:
    - "rsi < 30"
exit:
  condition:
    - "rsi > 70"
risk:
  stop_loss: 3
  take_profit: 8
  position_size: 10
`;

function mockGatewayResponse(yamlContent: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: yamlContent } }],
    }),
  });
}

describe('Issue #20 — Strategy Parser Service (NLP → StrategyDSL)', () => {
  let service: StrategyService;

  beforeEach(() => {
    service = new StrategyService();
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

  // AC: POST /api/strategy/parse returns StrategyDSL JSON reliably
  it('parses valid natural language into StrategyDSL', async () => {
    mockGatewayResponse(VALID_YAML);

    const result = await service.parseFromText('Buy BTC when RSI below 30, sell when above 70');

    expect(result.name).toBe('rsi_test');
    expect(result.market.symbol).toBe('BTCUSDT');
    expect(result.market.timeframe).toBe('1h');
    expect(result.indicator.rsi).toBe(14);
    expect(result.entry.condition).toContain('rsi < 30');
    expect(result.exit.condition).toContain('rsi > 70');
    expect(result.risk.stop_loss).toBe(3);
    expect(result.risk.take_profit).toBe(8);
    expect(result.risk.position_size).toBe(10);
  });

  // AC: strips accidental code fences before parsing
  it('strips ```yaml code fence from AI response', async () => {
    mockGatewayResponse('```yaml\n' + VALID_YAML + '\n```');

    const result = await service.parseFromText('some strategy');
    expect(result.name).toBe('rsi_test');
  });

  // AC: strips ```strategy code fence
  it('strips ```strategy code fence from AI response', async () => {
    mockGatewayResponse('```strategy\n' + VALID_YAML + '\n```');

    const result = await service.parseFromText('some strategy');
    expect(result.name).toBe('rsi_test');
  });

  // AC: invalid YAML returns 400
  it('throws BadRequestException when AI returns invalid YAML', async () => {
    mockGatewayResponse('this is not valid yaml: [[[');

    await expect(service.parseFromText('some strategy')).rejects.toThrow(BadRequestException);
  });

  // AC: empty response returns 400
  it('throws BadRequestException when AI returns empty response', async () => {
    mockGatewayResponse('   ');

    await expect(service.parseFromText('some strategy')).rejects.toThrow(BadRequestException);
  });

  // AC: missing required fields returns 400
  it('throws BadRequestException when required field "name" is missing', async () => {
    mockGatewayResponse(`
market:
  symbol: BTCUSDT
  timeframe: 1h
indicator:
  rsi: 14
entry:
  condition:
    - "rsi < 30"
exit:
  condition:
    - "rsi > 70"
risk:
  stop_loss: 3
  take_profit: 8
  position_size: 10
`);
    await expect(service.parseFromText('some strategy')).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when entry.condition is missing', async () => {
    mockGatewayResponse(`
strategy:
  name: no_entry
market:
  exchange: binance
  symbol: BTCUSDT
  timeframe: 1h
indicator:
  rsi: 14
entry:
  condition: []
exit:
  condition:
    - "rsi > 70"
risk:
  stop_loss: 3
  take_profit: 8
  position_size: 10
`);
    await expect(service.parseFromText('some strategy')).rejects.toThrow(BadRequestException);
  });

  // AC: Gateway 502 returns 400
  it('throws BadRequestException when Gateway returns 502', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: jest.fn().mockResolvedValue('Bad Gateway'),
    });

    await expect(service.parseFromText('some strategy')).rejects.toThrow(BadRequestException);
  });

  // AC: optional execution block is included when provided
  it('includes execution params when provided by AI', async () => {
    mockGatewayResponse(VALID_YAML + `
execution:
  commission: 0.001
  slippage: 0.0005
  leverage: 2
`);
    const result = await service.parseFromText('leveraged strategy');
    expect(result.execution?.leverage).toBe(2);
    expect(result.execution?.commission).toBe(0.001);
  });

  // AC: market.exchange defaults to "binance" even if omitted
  it('defaults market.exchange to "binance"', async () => {
    mockGatewayResponse(`
strategy:
  name: test
market:
  symbol: ETHUSDT
  timeframe: 4h
indicator:
  rsi: 14
entry:
  condition:
    - "rsi < 30"
exit:
  condition:
    - "rsi > 70"
risk:
  stop_loss: 3
  take_profit: 8
  position_size: 10
`);
    const result = await service.parseFromText('ETH strategy');
    expect(result.market.exchange).toBe('binance');
  });
});
