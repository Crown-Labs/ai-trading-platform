import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import ChatSidebar from './components/ChatSidebar';
import StrategyDSLViewer from './components/StrategyDSLViewer';
import BacktestStats from './components/BacktestStats';
import BacktestChart from './components/BacktestChart';
import TradeTable from './components/TradeTable';
import BacktestHeatmap from './components/BacktestHeatmap';
import { useChatSessions } from './hooks/useChatSessions';
import { ChatSession } from './types/chat';

function App() {
  const {
    sessions,
    activeSession,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
  } = useChatSessions();

  const handleUpdate = (partial: Partial<ChatSession>) => {
    if (activeSession) {
      updateSession(activeSession.id, partial);
    }
  };

  const strategy = activeSession?.strategy ?? null;
  const backtestResult = activeSession?.backtestResult ?? null;
  const candles = activeSession?.candles ?? [];

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — fixed height, scrollable */}
        <div className="w-64 flex-shrink-0 bg-dark-800 border-r border-dark-700 p-4 overflow-y-auto">
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSession?.id ?? null}
            onSelect={selectSession}
            onCreate={createSession}
            onDelete={deleteSession}
          />
        </div>

        {/* Left col: Chat — fixed, does not scroll */}
        <div className="flex-shrink-0 border-r border-dark-700 p-4 flex flex-col overflow-hidden" style={{ width: '520px' }}>
          {activeSession ? (
            <ChatPanel session={activeSession} onUpdate={handleUpdate} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-gray-500 text-sm mb-1">Select or create a chat</p>
              <p className="text-gray-600 text-xs">Use the sidebar on the left</p>
            </div>
          )}
        </div>

        {/* Right col: Results — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSession && (
            <>
              {strategy && <StrategyDSLViewer strategy={strategy} />}

              {backtestResult && (
                <>
                  <BacktestStats metrics={backtestResult.metrics} />
                  <BacktestHeatmap trades={backtestResult.trades} />
                  {candles.length > 0 && (
                    <BacktestChart
                      candles={candles}
                      trades={backtestResult.trades}
                      symbol={strategy?.market?.symbol ?? 'BTCUSDT'}
                      defaultTimeframe={strategy?.market?.timeframe ?? '1h'}
                    />
                  )}
                  <TradeTable trades={backtestResult.trades} />
                </>
              )}

              {!strategy && !backtestResult && (
                <div className="card text-center py-20">
                  <p className="text-gray-500 text-lg mb-2">No backtest results yet</p>
                  <p className="text-gray-600 text-sm">Describe a strategy in the chat panel, then click "Run Backtest"</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
