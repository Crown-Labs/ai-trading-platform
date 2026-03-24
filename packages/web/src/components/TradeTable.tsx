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
              <th className="text-left py-2 px-2">Side</th>
              <th className="text-left py-2 px-2">Entry Time</th>
              <th className="text-left py-2 px-2">Exit Time</th>
              <th className="text-right py-2 px-2">Entry Price</th>
              <th className="text-right py-2 px-2">Exit Price</th>
              <th className="text-right py-2 px-2">P&L</th>
              <th className="text-right py-2 px-2">%</th>
              <th className="text-right py-2 px-2">Fees</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr
                key={trade.id}
                className="border-b border-dark-700/50 hover:bg-dark-700/30"
              >
                <td className="py-2 px-2 text-gray-400">{trade.id}</td>
                <td className="py-2 px-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      trade.side === 'long'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {trade.side.toUpperCase()}
                  </span>
                </td>
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
                  ${trade.pnl.toFixed(2)}
                </td>
                <td
                  className={`py-2 px-2 text-right font-medium ${
                    trade.isWin ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {trade.pnlPercent}
                </td>
                <td className="py-2 px-2 text-right text-gray-500 text-xs">
                  ${trade.fees.toFixed(2)}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500">
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
