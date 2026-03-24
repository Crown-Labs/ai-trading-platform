import { useState } from 'react';
import { StrategyDSL } from '@ai-trading/shared';

interface ChatPanelProps {
  onStrategyParsed: (strategy: StrategyDSL) => void;
  onRunBacktest: () => void;
  strategy: StrategyDSL | null;
}

export default function ChatPanel({
  onStrategyParsed,
  onRunBacktest,
  strategy,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<
    { role: 'user' | 'ai'; text: string }[]
  >([]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/strategy/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMessage }),
      });
      const data: StrategyDSL = await res.json();
      onStrategyParsed(data);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `Parsed strategy: "${data.name}"\n\nSymbol: ${data.market.symbol} | Timeframe: ${data.market.timeframe}\nEntry: ${data.entry.condition.join(', ')}\nExit: ${data.exit.condition.join(', ')}\nStop Loss: ${data.risk.stop_loss}% | Take Profit: ${data.risk.take_profit}%`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Failed to parse strategy. Is the backend running?' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex flex-col h-full">
      <h2 className="text-lg font-bold text-white mb-4">Strategy Chat</h2>

      <div className="flex-grow overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[400px]">
        {messages.length === 0 && (
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
            <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
          </div>
        ))}
        {loading && (
          <div className="bg-dark-700 text-gray-400 p-3 rounded-lg text-sm mr-8">
            Parsing strategy...
          </div>
        )}
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

      {strategy && (
        <button
          onClick={onRunBacktest}
          className="btn-primary mt-3 w-full"
        >
          Run Backtest
        </button>
      )}
    </div>
  );
}
