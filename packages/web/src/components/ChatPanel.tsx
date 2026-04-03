import { useState, useRef, useEffect } from 'react';
import { StrategyDSL, BacktestRun, DEFAULT_INITIAL_CAPITAL, DEFAULT_POSITION_SIZE } from '@ai-trading/shared';
import YAML from 'yaml';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatSession, ChatMessage } from '../types/chat';

import { saveRunData } from '../lib/trade-store';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE, apiFetchRaw, getAuthHeaders } from '../lib/api';

interface ChatPanelProps {
  session: ChatSession;
  onUpdate: (partial: Partial<ChatSession>) => void;
  onAddRun?: (run: BacktestRun) => void;
}

function isStrategyYaml(yamlText: string): boolean {
  return (
    yamlText.includes('market:') &&
    yamlText.includes('indicator:') &&
    (yamlText.includes('entry:') || yamlText.includes('exit:'))
  );
}

function extractStrategyYaml(text: string): string | null {
  const strategyMatch = text.match(/```strategy\s*\n([\s\S]*?)```/);
  if (strategyMatch) return strategyMatch[1];

  const yamlMatch = text.match(/```yaml\s*\n([\s\S]*?)```/);
  if (yamlMatch && isStrategyYaml(yamlMatch[1])) return yamlMatch[1];

  const strategyIdx = text.indexOf('strategy:');
  if (strategyIdx !== -1) {
    const yamlText = text.substring(strategyIdx);
    const lines = yamlText.split('\n');
    const blockLines: string[] = [];
    let consecutiveBlanks = 0;
    for (const line of lines) {
      if (line.trim() === '') {
        consecutiveBlanks++;
        if (consecutiveBlanks >= 2) break;
        blockLines.push(line);
        continue;
      }
      consecutiveBlanks = 0;
      if (
        blockLines.length > 0 &&
        !/^[\s#\-"']/.test(line) &&
        !/^\w[\w_]*:/.test(line)
      ) {
        break;
      }
      blockLines.push(line);
    }
    const block = blockLines.join('\n').trim();
    if (block && isStrategyYaml(block)) return block;
  }

  return null;
}

function parseStrategyFromResponse(text: string): StrategyDSL | null {
  const yamlContent = extractStrategyYaml(text);
  if (!yamlContent) return null;

  try {
    let raw: any;
    try {
      raw = JSON.parse(yamlContent);
    } catch {
      raw = YAML.parse(yamlContent);
    }

    const parsed = raw.strategy ? { ...raw, name: raw.strategy.name ?? raw.name } : raw;

    if (
      !parsed.name ||
      !parsed.market?.symbol ||
      !parsed.market?.timeframe ||
      !parsed.entry?.condition?.length ||
      !parsed.exit?.condition?.length ||
      parsed.risk?.stop_loss == null ||
      parsed.risk?.take_profit == null
    ) {
      return null;
    }

    return {
      name: parsed.name,
      market: {
        exchange: parsed.market.exchange || 'binance',
        symbol: parsed.market.symbol,
        timeframe: parsed.market.timeframe,
      },
      indicator: { ...parsed.indicator },
      entry: {
        condition: parsed.entry.condition,
        ...(parsed.entry.short_condition?.length && {
          short_condition: parsed.entry.short_condition,
        }),
      },
      exit: {
        condition: parsed.exit.condition,
        ...(parsed.exit.short_condition?.length && {
          short_condition: parsed.exit.short_condition,
        }),
      },
      risk: {
        stop_loss: parsed.risk.stop_loss,
        take_profit: parsed.risk.take_profit,
        position_size: parsed.risk.position_size ?? DEFAULT_POSITION_SIZE,
      },
      ...(parsed.execution && { execution: parsed.execution }),
    };
  } catch {
    return null;
  }
}

export default function ChatPanel({ session, onUpdate, onAddRun }: ChatPanelProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });
  const [initialCapital, setInitialCapital] = useState(DEFAULT_INITIAL_CAPITAL);

  const PRESETS = [
    { label: '3M', months: 3 },
    { label: '6M', months: 6 },
    { label: '1Y', months: 12 },
    { label: '2Y', months: 24 },
    { label: '3Y', months: 36 },
  ];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const messages = session.messages;

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 50;
    isAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText]);

  const handleRunBacktest = async () => {
    const strategy = session.strategy;
    if (!strategy || backtestLoading) return;

    setBacktestLoading(true);

    const runMessage: ChatMessage = {
      role: 'user',
      content: `Run backtest for strategy: ${strategy.name}`,
    };
    const messagesWithRun = [...messages, runMessage];
    onUpdate({ messages: messagesWithRun });

    try {
      const strategyWithDates = {
        ...strategy,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        initialCapital,
      };

      const res = await apiFetchRaw('/api/backtest/run', {
        method: 'POST',
        body: JSON.stringify({ strategy: strategyWithDates }),
      });
      const backtestResult = await res.json();

      const candleRes = await fetch(
        `${API_BASE}/api/market-data/candles?symbol=${strategy.market.symbol}&interval=${strategy.market.timeframe}&startTime=${new Date(dateRange.startDate).getTime()}&endTime=${new Date(dateRange.endDate).getTime()}`,
        { headers: getAuthHeaders() },
      );
      const candles = candleRes.ok ? await candleRes.json() : [];

      onUpdate({ candles });

      if (onAddRun) {
        const runId = crypto.randomUUID();
        const version = (session.backtestRuns?.length ?? 0) + 1;
        const run: BacktestRun = {
          id: runId,
          version,
          strategyName: strategy.name,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          strategy: strategyWithDates,
          result: backtestResult,
          createdAt: new Date().toISOString(),
        };

        await saveRunData({
          runId,
          trades: backtestResult.trades ?? [],
          candles,
          dataRange: backtestResult.dataRange,
        });
        queryClient.invalidateQueries({ queryKey: ['run-data', runId] });
        onAddRun(run);
      }

      const mt = backtestResult.metrics;
      const analysisRequest = `Backtest complete for "${strategy.name}". Here are the results:

Performance Metrics:
- Total Return: ${mt.totalReturn.toFixed(2)}%
- Win Rate: ${mt.winRate.toFixed(1)}%
- Sharpe Ratio: ${mt.sharpeRatio.toFixed(2)}
- Max Drawdown: ${mt.maxDrawdown.toFixed(2)}%
- Profit Factor: ${mt.profitFactor.toFixed(2)}
- Total Trades: ${mt.totalTrades}

Please analyze these results and suggest specific improvements to optimize the strategy.`;

      const messagesForAI: ChatMessage[] = [
        ...messagesWithRun,
        { role: 'user', content: analysisRequest },
      ];

      setStreamingText('');

      const aiRes = await apiFetchRaw('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: messagesForAI.map((m) => ({ role: m.role, content: m.content })),
          sessionId: session.id,
        }),
      });

      if (aiRes.ok) {
        const reader = aiRes.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let fullText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  setStreamingText(fullText);
                }
              } catch {
                /* skip */
              }
            }
          }

          setStreamingText('');
          const suggestedStrategy = parseStrategyFromResponse(fullText);
          onUpdate({
            messages: [
              ...messagesWithRun,
              {
                role: 'assistant',
                content: fullText,
                ...(suggestedStrategy && { strategy: suggestedStrategy }),
              },
            ],
            backtestResult,
            candles,
          });
        }
      }
    } catch (err) {
      console.error('Backtest failed:', err);
      onUpdate({
        messages: [
          ...messagesWithRun,
          { role: 'assistant', content: 'Backtest failed. Please try again.' },
        ],
        backtestResult: session.backtestResult,
        candles: session.candles,
      });
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    onUpdate({ messages: newMessages });
    setInput('');
    setLoading(true);
    setStreamingText('');

    try {
      const res = await apiFetchRaw('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          sessionId: session.id,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              setStreamingText(fullText);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      const parsedStrategy = parseStrategyFromResponse(fullText);
      const hasActiveStrategy = !!session.strategy;

      const finalMessages: ChatMessage[] = [
        ...newMessages,
        {
          role: 'assistant',
          content: fullText,
          ...(parsedStrategy && { strategy: parsedStrategy }),
        },
      ];
      setStreamingText('');

      onUpdate({
        messages: finalMessages,
        ...(parsedStrategy && !hasActiveStrategy && { strategy: parsedStrategy }),
      });
    } catch {
      onUpdate({
        messages: [
          ...newMessages,
          {
            role: 'assistant',
            content: 'Failed to get response. Is the backend running?',
          },
        ],
      });
      setStreamingText('');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(```(?:strategy|yaml)\s*\n[\s\S]*?```)/);
    return (
      <>
        {parts.map((part, i) => {
          const isStrategyBlock = part.startsWith('```strategy');
          const isYamlStrategyBlock = part.startsWith('```yaml') && isStrategyYaml(part);
          if (isStrategyBlock || isYamlStrategyBlock) {
            const code = part.replace(/```(?:strategy|yaml)\s*\n/, '').replace(/```$/, '');
            return (
              <pre
                key={i}
                className="bg-dark-900 border border-dark-700 rounded p-2 mt-2 mb-2 text-[11px] overflow-x-auto"
                style={{ color: '#fcd34d' }}
              >
                <code>{code}</code>
              </pre>
            );
          }
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-gray-100 font-bold text-sm mt-3 mb-1">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-gray-100 font-bold text-xs mt-3 mb-1">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-gray-200 font-semibold text-xs mt-2 mb-1">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-200 text-xs mb-2 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="text-gray-100 font-semibold">{children}</strong>
                ),
                em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-gray-300 text-xs space-y-0.5 mb-2 pl-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-gray-300 text-xs space-y-0.5 mb-2 pl-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="text-gray-300 text-xs">{children}</li>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  return isBlock ? (
                    <pre className="bg-dark-900 rounded p-2 text-[11px] text-gray-300 overflow-x-auto my-2">
                      <code>{children}</code>
                    </pre>
                  ) : (
                    <code className="bg-dark-900 text-accent text-[11px] px-1 py-0.5 rounded">
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="w-full text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead>{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => (
                  <tr className="border-b border-dark-700">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="text-left text-muted font-medium py-1 px-2 bg-dark-700/50">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="text-gray-300 py-1 px-2">{children}</td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-accent pl-3 my-2 text-muted italic text-xs">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="border-dark-700 my-3" />,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-accent underline hover:opacity-80"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {part}
            </ReactMarkdown>
          );
        })}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-dark-800">
      {/* Chat header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-dark-700 flex-shrink-0">
        <span className="text-[10px] text-muted uppercase tracking-wider">AI Assistant</span>
        <span className="bg-accent text-dark-900 text-[10px] px-1.5 py-0.5 rounded font-bold">
          {session.title}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5 min-h-0"
      >
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-muted text-xs font-medium mb-1">Start with a strategy</p>
            <p className="text-muted/60 text-[11px]">
              e.g. &quot;Buy BTC when RSI drops below 30, sell when RSI hits 70&quot;
            </p>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[92%]">
                <div
                  className="px-2.5 py-2 rounded-md text-[12px] leading-relaxed font-mono"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                >
                  {msg.content}
                </div>
                <div className="text-[10px] text-muted mt-1 text-right pr-1">You</div>
              </div>
            </div>
          ) : (
            <div key={i} className="flex flex-col gap-1.5 max-w-[92%]">
              <div className="bg-dark-700 border border-dark-700 px-2.5 py-2 rounded-md text-[12px] leading-relaxed">
                <div className="font-mono">{renderContent(msg.content)}</div>
              </div>
              <div className="text-[10px] text-muted pl-1">AlgoEdge AI</div>
              {/* Strategy card attached to this message */}
              {msg.strategy && (
                <div className="bg-dark-900 border border-dark-700 rounded px-3 py-2 text-xs"
                  style={{ borderColor: 'rgba(240,185,11,0.25)', background: 'rgba(240,185,11,0.04)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-accent font-medium truncate text-[10px] mb-0.5">
                        ✨ AI suggests a new strategy
                      </p>
                      <p className="text-gray-200 text-[11px] font-mono">{msg.strategy.name}</p>
                      <p className="text-muted text-[10px] mt-0.5">
                        {msg.strategy.market.symbol} · {msg.strategy.market.timeframe} · SL{' '}
                        {msg.strategy.risk.stop_loss}% · TP {msg.strategy.risk.take_profit}%
                      </p>
                    </div>
                    {(() => {
                      const activeRun = session.backtestRuns?.find(
                        (r) => r.id === session.activeRunId,
                      );
                      const isActive = !activeRun
                        ? session.strategy?.name === msg.strategy!.name
                        : activeRun.strategy.name === msg.strategy!.name;
                      return (
                        <button
                          onClick={() =>
                            onUpdate({
                              strategy: msg.strategy,
                              activeRunId: undefined,
                              backtestResult: undefined,
                            })
                          }
                          className={`flex-shrink-0 px-3 py-1 rounded text-xs font-bold font-mono transition-colors ${
                            isActive
                              ? 'bg-accent/20 text-accent cursor-default'
                              : 'bg-accent text-dark-900 hover:opacity-90'
                          }`}
                          style={{ border: 'none' }}
                          disabled={isActive}
                        >
                          {isActive ? 'Active' : 'Apply & Run'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ),
        )}

        {streamingText && (
          <div className="flex flex-col gap-1.5 max-w-[92%]">
            <div className="bg-dark-700 border border-dark-700 px-2.5 py-2 rounded-md text-[12px] leading-relaxed">
              <div className="font-mono">{renderContent(streamingText)}</div>
              <span
                className="inline-block w-1.5 h-3 bg-accent animate-pulse ml-0.5 align-middle"
              />
            </div>
            <div className="text-[10px] text-muted pl-1">AlgoEdge AI</div>
          </div>
        )}

        {loading && !streamingText && (
          <div className="flex items-center gap-2">
            <div className="bg-dark-700 border border-dark-700 px-3 py-2 rounded-md">
              <div className="flex gap-1 items-center h-4">
                <span
                  className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="border-t border-dark-700 px-3 py-2 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe a strategy or ask AI to modify..."
            className="flex-1 bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-gray-200 text-[12px] placeholder-muted resize-none focus:outline-none focus:border-muted transition-colors font-mono"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-accent border-none rounded px-3.5 py-1.5 text-dark-900 text-[12px] font-bold cursor-pointer font-mono flex-shrink-0 self-end disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Backtest controls */}
      {session.strategy && (
        <div className="border-t border-dark-700 px-3 py-2 bg-dark-900 flex-shrink-0">
          <div className="text-[9px] text-muted uppercase tracking-wider mb-1.5">
            Backtest Parameters
          </div>

          {/* Range presets */}
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            <span className="text-[10px] text-muted">Range:</span>
            {PRESETS.map((p) => {
              const start = new Date();
              start.setMonth(start.getMonth() - p.months);
              const startStr = start.toISOString().slice(0, 10);
              const isActive = dateRange.startDate === startStr;
              return (
                <button
                  key={p.label}
                  onClick={() =>
                    setDateRange({
                      startDate: startStr,
                      endDate: new Date().toISOString().slice(0, 10),
                    })
                  }
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono border transition-colors ${
                    isActive
                      ? 'bg-accent border-accent text-dark-900 font-bold'
                      : 'bg-dark-800 border-dark-700 text-muted hover:text-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Date pickers */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((d) => ({ ...d, startDate: e.target.value }))}
              className="flex-1 bg-dark-800 border border-dark-700 rounded px-1.5 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-muted font-mono"
            />
            <span className="text-muted text-[11px]">→</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((d) => ({ ...d, endDate: e.target.value }))}
              className="flex-1 bg-dark-800 border border-dark-700 rounded px-1.5 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-muted font-mono"
            />
          </div>

          {/* Capital */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="text-[10px] text-muted whitespace-nowrap">Capital ($)</label>
            <input
              type="number"
              min={100}
              step={1000}
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="flex-1 bg-dark-800 border border-dark-700 rounded px-1.5 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-muted font-mono"
            />
          </div>

          <button
            onClick={handleRunBacktest}
            disabled={backtestLoading}
            className="w-full bg-accent border-none rounded text-dark-900 text-[12px] font-bold py-2 cursor-pointer font-mono tracking-wider hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {backtestLoading ? 'Running...' : '⚡ RUN BACKTEST'}
          </button>
        </div>
      )}
    </div>
  );
}
