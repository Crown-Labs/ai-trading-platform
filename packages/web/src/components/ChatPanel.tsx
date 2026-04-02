import { useState, useRef, useEffect } from 'react';
import { StrategyDSL, BacktestRun, DEFAULT_INITIAL_CAPITAL, DEFAULT_POSITION_SIZE } from '@ai-trading/shared';
import YAML from 'yaml';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatSession, ChatMessage } from '../types/chat';

import { saveRunData } from '../lib/trade-store';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../lib/api';

interface ChatPanelProps {
  session: ChatSession;
  onUpdate: (partial: Partial<ChatSession>) => void;
  onAddRun?: (run: BacktestRun) => void;
}

function isStrategyYaml(yamlText: string): boolean {
  return yamlText.includes('market:') &&
    yamlText.includes('indicator:') &&
    (yamlText.includes('entry:') || yamlText.includes('exit:'));
}

function extractStrategyYaml(text: string): string | null {
  // Pattern 1: ```strategy fence
  const strategyMatch = text.match(/```strategy\s*\n([\s\S]*?)```/);
  if (strategyMatch) return strategyMatch[1];

  // Pattern 2: ```yaml fence with strategy content
  const yamlMatch = text.match(/```yaml\s*\n([\s\S]*?)```/);
  if (yamlMatch && isStrategyYaml(yamlMatch[1])) return yamlMatch[1];

  // Pattern 3: Plain YAML block starting with 'strategy:' anywhere in text
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
      if (blockLines.length > 0 && !/^[\s#\-"']/.test(line) && !/^\w[\w_]*:/.test(line)) {
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
    // Try JSON first, fallback to YAML (support both formats)
    let raw: any;
    try {
      raw = JSON.parse(yamlContent);
    } catch {
      raw = YAML.parse(yamlContent);
    }

    // Support both flat format { name, market, ... }
    // and nested format { strategy: { name }, market, ... }
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
      indicator: {
        // pass all indicator fields through — backend handles all types
        ...parsed.indicator,
      },
      entry: {
        condition: parsed.entry.condition,
        ...(parsed.entry.short_condition?.length && { short_condition: parsed.entry.short_condition }),
      },
      exit: {
        condition: parsed.exit.condition,
        ...(parsed.exit.short_condition?.length && { short_condition: parsed.exit.short_condition }),
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
    isAtBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
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

    // 1. Add user message
    const runMessage: ChatMessage = {
      role: 'user',
      content: `Run backtest for strategy: ${strategy.name}`,
    };
    const messagesWithRun = [...messages, runMessage];
    onUpdate({ messages: messagesWithRun });

    try {
      // 2. Run backtest
      const strategyWithDates = {
        ...strategy,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        initialCapital,
      };

      const res = await fetch(API_BASE + '/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: strategyWithDates }),
      });
      const backtestResult = await res.json();

      const candleRes = await fetch(
        `${API_BASE}/api/market-data/candles?symbol=${strategy.market.symbol}&interval=${strategy.market.timeframe}&startTime=${new Date(dateRange.startDate).getTime()}&endTime=${new Date(dateRange.endDate).getTime()}`,
      );
      const candles = candleRes.ok ? await candleRes.json() : [];

      // 3. Save candles in session (in-memory) + create versioned run
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

        // Save trades + candles to IndexedDB (large data, not localStorage)
        await saveRunData({
          runId,
          trades: backtestResult.trades ?? [],
          candles,
          dataRange: backtestResult.dataRange,
        });
        // Invalidate React Query cache for this runId
        queryClient.invalidateQueries({ queryKey: ['run-data', runId] });

        onAddRun(run);
      }

      // 4. Send backtest results to AI for analysis
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

      const aiRes = await fetch(API_BASE + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              } catch { /* skip */ }
            }
          }

          setStreamingText('');
          // Attach strategy to message for history access — never override session.strategy from analysis
          const suggestedStrategy = parseStrategyFromResponse(fullText);
          onUpdate({
            messages: [
              ...messagesWithRun,
              { role: 'assistant', content: fullText, ...(suggestedStrategy && { strategy: suggestedStrategy }) },
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
        // preserve existing backtest data if run fails
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

    // Strategy is parsed from AI chat response via parseStrategyFromResponse()
    // /api/strategy/parse endpoint is no longer called from the frontend

    try {
      const res = await fetch(API_BASE + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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

      // Attach strategy to message so it's always accessible in history
      const finalMessages: ChatMessage[] = [
        ...newMessages,
        { role: 'assistant', content: fullText, ...(parsedStrategy && { strategy: parsedStrategy }) },
      ];
      setStreamingText('');

      onUpdate({
        messages: finalMessages,
        // First strategy → auto-set as active; subsequent → user picks from history
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
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 10px', fontSize: '11px', color: '#fcd34d', marginTop: '6px', marginBottom: '6px', overflowX: 'auto', whiteSpace: 'pre' }}
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
                h1: ({ children }) => <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: '14px', marginTop: '10px', marginBottom: '4px' }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ color: 'var(--text)', fontWeight: 700, fontSize: '13px', marginTop: '8px', marginBottom: '4px' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ color: 'var(--text)', fontWeight: 600, fontSize: '12px', marginTop: '6px', marginBottom: '3px' }}>{children}</h3>,
                p: ({ children }) => <p style={{ color: 'var(--text)', fontSize: '12px', marginBottom: '6px', lineHeight: 1.5 }}>{children}</p>,
                strong: ({ children }) => <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{children}</strong>,
                em: ({ children }) => <em style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{children}</em>,
                ul: ({ children }) => <ul style={{ color: 'var(--text)', fontSize: '12px', marginBottom: '6px', paddingLeft: '16px' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ color: 'var(--text)', fontSize: '12px', marginBottom: '6px', paddingLeft: '16px' }}>{children}</ol>,
                li: ({ children }) => <li style={{ color: 'var(--text)', fontSize: '12px', marginBottom: '2px' }}>{children}</li>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  return isBlock ? (
                    <pre style={{ background: 'var(--bg)', borderRadius: '4px', padding: '8px 10px', fontSize: '11px', color: 'var(--muted)', overflowX: 'auto', margin: '6px 0' }}>
                      <code>{children}</code>
                    </pre>
                  ) : (
                    <code style={{ background: 'var(--bg)', color: '#fcd34d', fontSize: '11px', padding: '1px 5px', borderRadius: '3px' }}>{children}</code>
                  );
                },
                table: ({ children }) => (
                  <div style={{ overflowX: 'auto', margin: '6px 0' }}>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead>{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr style={{ borderBottom: '1px solid var(--border)' }}>{children}</tr>,
                th: ({ children }) => <th style={{ textAlign: 'left', color: 'var(--muted)', fontWeight: 600, padding: '4px 8px', background: 'var(--surface2)', fontSize: '10px' }}>{children}</th>,
                td: ({ children }) => <td style={{ color: 'var(--text)', padding: '4px 8px', fontSize: '11px' }}>{children}</td>,
                blockquote: ({ children }) => (
                  <blockquote style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '10px', margin: '6px 0', color: 'var(--muted)', fontStyle: 'italic', fontSize: '12px' }}>{children}</blockquote>
                ),
                hr: () => <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />,
                a: ({ href, children }) => (
                  <a href={href} style={{ color: 'var(--accent)', textDecoration: 'underline' }} target="_blank" rel="noreferrer">{children}</a>
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat header */}
      <div
        className="flex items-center justify-between border-b border-terminal-border flex-shrink-0"
        style={{ padding: '10px 14px' }}
      >
        <span
          className="text-terminal-muted"
          style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          AI Assistant
        </span>
        {session.title && (
          <span
            className="text-terminal-bg font-bold"
            style={{ background: 'var(--accent)', fontSize: '10px', padding: '2px 7px', borderRadius: '3px' }}
          >
            {session.title}
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0"
        style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-terminal-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>
              Start with a strategy
            </p>
            <p className="text-terminal-muted" style={{ fontSize: '11px' }}>
              e.g. &quot;Buy BTC when RSI drops below 30&quot;
            </p>
          </div>
        )}
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="msg user" style={{ maxWidth: '92%', alignSelf: 'flex-end' }}>
              <div
                className="text-terminal-bg"
                style={{
                  background: 'var(--accent)',
                  padding: '8px 11px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} style={{ maxWidth: '92%', alignSelf: 'flex-start' }}>
              <div
                className="text-terminal-text"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  padding: '8px 11px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                <div>{renderContent(msg.content)}</div>
              </div>
              {/* Strategy card attached to this message */}
              {msg.strategy && (
                <div
                  className="border border-terminal-border"
                  style={{
                    marginTop: '6px',
                    background: 'var(--bg)',
                    borderRadius: '4px',
                    padding: '8px 10px',
                    fontSize: '11px',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-terminal-accent font-medium truncate">⚡ {msg.strategy.name}</p>
                      <p className="text-terminal-muted" style={{ marginTop: '2px' }}>
                        {msg.strategy.market.symbol} · {msg.strategy.market.timeframe} · SL {msg.strategy.risk.stop_loss}% · TP {msg.strategy.risk.take_profit}%
                      </p>
                    </div>
                    {(() => {
                        const activeRun = session.backtestRuns?.find(r => r.id === session.activeRunId);
                        const isActive = !activeRun
                          ? session.strategy?.name === msg.strategy.name
                          : activeRun.strategy.name === msg.strategy.name;
                        return (
                          <button
                            onClick={() => onUpdate({
                              strategy: msg.strategy,
                              activeRunId: undefined,
                              backtestResult: undefined,
                            })}
                            className="flex-shrink-0 btn-primary disabled:opacity-50"
                            style={{ padding: '3px 10px', fontSize: '10px' }}
                            disabled={isActive}
                          >
                            {isActive ? 'Active' : 'Apply'}
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
          <div style={{ maxWidth: '92%', alignSelf: 'flex-start' }}>
            <div
              className="text-terminal-text"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                padding: '8px 11px',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              <div>{renderContent(streamingText)}</div>
              <span
                className="inline-block bg-terminal-accent animate-pulse align-middle"
                style={{ width: '6px', height: '14px', marginLeft: '2px' }}
              />
            </div>
          </div>
        )}
        {loading && !streamingText && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                padding: '8px 11px',
                borderRadius: '6px',
                display: 'flex',
                gap: '3px',
                alignItems: 'center',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-muted animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-muted animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-muted animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-terminal-border flex-shrink-0" style={{ padding: '10px 14px' }}>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI to modify strategy…"
            className="term-input flex-1 resize-none"
            style={{ borderRadius: '5px', padding: '7px 10px', fontSize: '12px' }}
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="btn-primary flex-shrink-0 self-end disabled:opacity-40"
            style={{ padding: '7px 14px' }}
          >
            ▶ Run
          </button>
        </div>
      </div>

      {/* Backtest controls */}
      {session.strategy && (
        <div
          className="border-t border-terminal-border flex-shrink-0"
          style={{ padding: '10px 14px', background: 'var(--bg)' }}
        >
          <div
            className="text-terminal-muted"
            style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}
          >
            Backtest Parameters
          </div>

          {/* Preset range buttons */}
          <div className="flex items-center gap-1" style={{ marginBottom: '6px' }}>
            <span className="text-terminal-muted" style={{ fontSize: '10px' }}>Range:</span>
            {PRESETS.map((p) => {
              const start = new Date();
              start.setMonth(start.getMonth() - p.months);
              const startStr = start.toISOString().slice(0, 10);
              const isActive = dateRange.startDate === startStr;
              return (
                <button
                  key={p.label}
                  onClick={() => setDateRange({ startDate: startStr, endDate: new Date().toISOString().slice(0, 10) })}
                  style={{
                    padding: '2px 7px',
                    fontSize: '10px',
                    fontWeight: 600,
                    borderRadius: '3px',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--bg)' : 'var(--muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-2 gap-1.5" style={{ marginBottom: '6px' }}>
            <div>
              <label className="text-terminal-muted" style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((d) => ({ ...d, startDate: e.target.value }))}
                className="term-input w-full"
              />
            </div>
            <div>
              <label className="text-terminal-muted" style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((d) => ({ ...d, endDate: e.target.value }))}
                className="term-input w-full"
              />
            </div>
            <div>
              <label className="text-terminal-muted" style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>
                Capital ($)
              </label>
              <input
                type="number"
                min={100}
                step={1000}
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                className="term-input w-full"
              />
            </div>
          </div>

          <button
            onClick={handleRunBacktest}
            disabled={backtestLoading}
            className="btn-primary w-full disabled:opacity-50"
            style={{ padding: '8px', fontSize: '12px', letterSpacing: '0.05em' }}
          >
            {backtestLoading ? '⟳ Running...' : '⚡ RUN BACKTEST'}
          </button>
        </div>
      )}
    </div>
  );
}
