import { Trade } from '@ai-trading/shared';

interface TradeTableProps {
  trades: Trade[];
}

export default function TradeTable({ trades }: TradeTableProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-bold text-white mb-4">Trade History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-dark-700">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Entry Time</th>
              <th className="text-left py-2 px-2">Exit Time</th>
              <th className="text-right py-2 px-2">Entry Price</th>
              <th className="text-right py-2 px-2">Exit Price</th>
              <th className="text-right py-2 px-2">P&L</th>
              <th className="text-right py-2 px-2">%</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr
                key={trade.id}
                className="border-b border-dark-700/50 hover:bg-dark-700/30"
              >
                <td className="py-2 px-2 text-gray-400">{trade.id}</td>
                <td className="py-2 px-2 text-gray-300">
                  {new Date(trade.entryTime).toLocaleDateString()}
                </td>
                <td className="py-2 px-2 text-gray-300">
                  {new Date(trade.exitTime).toLocaleDateString()}
                </td>
                <td className="py-2 px-2 text-right text-gray-300">
                  ${trade.entryPrice.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right text-gray-300">
                  ${trade.exitPrice.toFixed(2)}
                </td>
                <td
                  className={`py-2 px-2 text-right font-medium ${
                    trade.isWin ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  ${trade.profit.toFixed(2)}
                </td>
                <td
                  className={`py-2 px-2 text-right font-medium ${
                    trade.isWin ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {trade.profitPercent > 0 ? '+' : ''}
                  {trade.profitPercent.toFixed(2)}%
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  No trades yet. Run a backtest to see results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
