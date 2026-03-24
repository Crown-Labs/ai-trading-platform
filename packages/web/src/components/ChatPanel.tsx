import { useState, useRef, useEffect } from 'react';
import { StrategyDSL } from '@ai-trading/shared';
import YAML from 'yaml';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatSession, ChatMessage } from '../types/chat';

interface ChatPanelProps {
  session: ChatSession;
  onUpdate: (partial: Partial<ChatSession>) => void;
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

  // Pattern 3: Plain YAML block (lines starting with strategy:/market: keys)
  const lines = text.split('\n');
  let blockLines: string[] = [];
  let capturing = false;
  for (const line of lines) {
    if (!capturing && /^(strategy|market|name):/.test(line)) {
      capturing = true;
    }
    if (capturing) {
      if (line.trim() === '' && blockLines.length > 0) {
        // Allow one blank line inside, but stop at two consecutive
        const lastWasBlank = blockLines[blockLines.length - 1]?.trim() === '';
        if (lastWasBlank) break;
      }
      if (capturing && line.trim() !== '' && !/^[\s#\-]/.test(line) && !/^\w[\w_]*:/.test(line)) {
        break;
      }
      blockLines.push(line);
    }
  }
  const block = blockLines.join('\n').trim();
  if (block && isStrategyYaml(block)) return block;

  return null;
}

function parseStrategyFromResponse(text: string): StrategyDSL | null {
  const yamlContent = extractStrategyYaml(text);
  if (!yamlContent) return null;

  try {
    const raw = YAML.parse(yamlContent);

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
      parsed.risk?.take_profit == null ||
      parsed.risk?.position_size == null
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
        rsi: parsed.indicator?.rsi,
        ema_fast: parsed.indicator?.ema_fast,
        ema_slow: parsed.indicator?.ema_slow,
      },
      entry: { condition: parsed.entry.condition },
      exit: { condition: parsed.exit.condition },
      risk: {
        stop_loss: parsed.risk.stop_loss,
        take_profit: parsed.risk.take_profit,
        position_size: parsed.risk.position_size,
      },
      ...(parsed.execution && { execution: parsed.execution }),
    };
  } catch {
    return null;
  }
}

export default function ChatPanel({ session, onUpdate }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });

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
      };

      const res = await fetch('http://localhost:4000/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: strategyWithDates }),
      });
      const backtestResult = await res.json();

      const candleRes = await fetch(
        `http://localhost:4000/api/market-data/candles?symbol=${strategy.market.symbol}&interval=${strategy.market.timeframe}&startTime=${new Date(dateRange.startDate).getTime()}&endTime=${new Date(dateRange.endDate).getTime()}`,
      );
      const candles = candleRes.ok ? await candleRes.json() : [];

      // 3. Update charts
      onUpdate({ backtestResult, candles });

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

      const aiRes = await fetch('http://localhost:4000/api/ai/chat', {
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
          // Parse new strategy suggestion from AI analysis response
          const suggestedStrategy = parseStrategyFromResponse(fullText);
          onUpdate({
            messages: [
              ...messagesWithRun,
              { role: 'assistant', content: fullText },
            ],
            backtestResult,
            candles,
            // Update strategy if AI suggested a new one in the analysis
            ...(suggestedStrategy && { strategy: suggestedStrategy }),
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

    try {
      const res = await fetch('http://localhost:4000/api/ai/chat', {
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

      const finalMessages: ChatMessage[] = [
        ...newMessages,
        { role: 'assistant', content: fullText },
      ];
      setStreamingText('');

      const strategy = parseStrategyFromResponse(fullText);
      onUpdate({
        messages: finalMessages,
        ...(strategy && { strategy }),
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
                className="bg-dark-900 border border-primary-500/30 rounded-lg p-3 mt-2 mb-2 text-primary-300 text-xs overflow-x-auto"
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
                h1: ({ children }) => <h1 className="text-white font-bold text-base mt-3 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-white font-bold text-sm mt-3 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-gray-200 font-semibold text-sm mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="text-gray-200 text-sm mb-2 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 text-sm space-y-0.5 mb-2 pl-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 text-sm space-y-0.5 mb-2 pl-2">{children}</ol>,
                li: ({ children }) => <li className="text-gray-300 text-sm">{children}</li>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  return isBlock ? (
                    <pre className="bg-dark-900 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto my-2">
                      <code>{children}</code>
                    </pre>
                  ) : (
                    <code className="bg-dark-900 text-primary-300 text-xs px-1.5 py-0.5 rounded">{children}</code>
                  );
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="w-full text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead>{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr className="border-b border-dark-600">{children}</tr>,
                th: ({ children }) => <th className="text-left text-gray-400 font-medium py-1.5 px-2 bg-dark-700/50">{children}</th>,
                td: ({ children }) => <td className="text-gray-300 py-1.5 px-2">{children}</td>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary-500 pl-3 my-2 text-gray-400 italic text-sm">{children}</blockquote>
                ),
                hr: () => <hr className="border-dark-600 my-3" />,
                a: ({ href, children }) => (
                  <a href={href} className="text-primary-400 underline hover:text-primary-300" target="_blank" rel="noreferrer">{children}</a>
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
      <h2 className="text-lg font-bold text-white mb-4">Strategy Chat</h2>

      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-3">
              <span className="text-2xl">&#x1F4C8;</span>
            </div>
            <p className="text-gray-400 text-sm font-medium mb-1">Start with a strategy</p>
            <p className="text-gray-600 text-xs">
              e.g. &quot;Buy BTC when RSI drops below 30, sell when RSI hits 70, stop loss 3%&quot;
            </p>
          </div>
        )}
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] bg-primary-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full bg-dark-600 border border-primary-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-400 text-xs font-bold">AI</span>
              </div>
              <div className="max-w-[85%] bg-dark-700 text-gray-200 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm">
                <div className="font-sans">{renderContent(msg.content)}</div>
              </div>
            </div>
          ),
        )}
        {streamingText && (
          <div className="flex gap-2 items-start">
            <div className="w-7 h-7 rounded-full bg-dark-600 border border-primary-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary-400 text-xs font-bold">AI</span>
            </div>
            <div className="max-w-[85%] bg-dark-700 text-gray-200 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm">
              <div className="font-sans">{renderContent(streamingText)}</div>
              <span className="inline-block w-1.5 h-4 bg-primary-400 animate-pulse ml-0.5 align-middle" />
            </div>
          </div>
        )}
        {loading && !streamingText && (
          <div className="flex gap-2 items-center">
            <div className="w-7 h-7 rounded-full bg-dark-600 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-400 text-xs font-bold">AI</span>
            </div>
            <div className="bg-dark-700 px-4 py-2.5 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-dark-700 pt-3">
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
            placeholder="Describe your trading strategy..."
            className="flex-grow bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-gray-200 text-sm placeholder-gray-600 resize-none focus:outline-none focus:border-primary-500/50 transition-colors"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors flex-shrink-0 self-end"
          >
            Send
          </button>
        </div>
      </div>

      {session.strategy && (
        <div className="border-t border-dark-700 pt-3 mt-1 space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Range:</span>
            {PRESETS.map((p) => {
              const start = new Date();
              start.setMonth(start.getMonth() - p.months);
              const startStr = start.toISOString().slice(0, 10);
              const isActive = dateRange.startDate === startStr;
              return (
                <button
                  key={p.label}
                  onClick={() => setDateRange({ startDate: startStr, endDate: new Date().toISOString().slice(0, 10) })}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((d) => ({ ...d, startDate: e.target.value }))}
              className="flex-1 bg-dark-700 border border-dark-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-primary-500"
            />
            <span className="text-gray-600 text-xs">&rarr;</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((d) => ({ ...d, endDate: e.target.value }))}
              className="flex-1 bg-dark-700 border border-dark-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <button
            onClick={handleRunBacktest}
            disabled={backtestLoading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {backtestLoading ? 'Running Backtest...' : 'Run Backtest'}
          </button>
        </div>
      )}
    </div>
  );
}
