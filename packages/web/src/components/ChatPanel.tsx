import { useState, useRef, useEffect } from 'react';
import { StrategyDSL } from '@ai-trading/shared';
import YAML from 'yaml';
import { ChatSession, ChatMessage } from '../types/chat';

interface ChatPanelProps {
  session: ChatSession;
  onUpdate: (partial: Partial<ChatSession>) => void;
}

function parseStrategyFromResponse(text: string): StrategyDSL | null {
  const match = text.match(/```strategy\s*\n([\s\S]*?)```/);
  if (!match) return null;

  try {
    const parsed = YAML.parse(match[1]);

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
    };
  } catch {
    return null;
  }
}

export default function ChatPanel({ session, onUpdate }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = session.messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleRunBacktest = async () => {
    const strategy = session.strategy;
    if (!strategy) return;

    try {
      const res = await fetch('http://localhost:4000/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      });
      const backtestResult = await res.json();

      const candleRes = await fetch(
        `http://localhost:4000/api/market-data/candles?symbol=${strategy.market.symbol}&interval=${strategy.market.timeframe}&limit=500`,
      );
      const candles = candleRes.ok ? await candleRes.json() : [];

      onUpdate({ backtestResult, candles });
    } catch (err) {
      console.error('Backtest failed:', err);
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
    const parts = text.split(/(```strategy\s*\n[\s\S]*?```)/);
    return parts.map((part, i) => {
      if (part.startsWith('```strategy')) {
        const code = part.replace(/```strategy\s*\n/, '').replace(/```$/, '');
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
        <span key={i} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="card flex flex-col h-full">
      <h2 className="text-lg font-bold text-white mb-4">Strategy Chat</h2>

      <div className="flex-grow overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[400px]">
        {messages.length === 0 && !streamingText && (
          <p className="text-gray-500 text-sm">
            Describe your trading strategy in plain English...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg text-sm ${
              msg.role === 'user'
                ? 'bg-primary-600/20 text-primary-300 ml-8'
                : 'bg-dark-700 text-gray-300 mr-8'
            }`}
          >
            <span className="font-medium text-xs text-gray-500 block mb-1">
              {msg.role === 'user' ? 'You' : 'AI'}
            </span>
            <div className="font-sans">
              {msg.role === 'assistant'
                ? renderContent(msg.content)
                : msg.content}
            </div>
          </div>
        ))}
        {streamingText && (
          <div className="bg-dark-700 text-gray-300 p-3 rounded-lg text-sm mr-8">
            <span className="font-medium text-xs text-gray-500 block mb-1">
              AI
            </span>
            <div className="font-sans">{renderContent(streamingText)}</div>
          </div>
        )}
        {loading && !streamingText && (
          <div className="bg-dark-700 text-gray-400 p-3 rounded-lg text-sm mr-8">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

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
          placeholder="e.g. Buy BTC when RSI below 30, sell when RSI above 70, stop loss 2%"
          className="flex-grow bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-gray-200 text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-primary-500"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="btn-primary px-4 self-end disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {session.strategy && (
        <button onClick={handleRunBacktest} className="btn-primary mt-3 w-full">
          Run Backtest
        </button>
      )}
    </div>
  );
}
