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
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />

      <main className="flex-grow flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 bg-dark-800 border-r border-dark-700 p-4 overflow-y-auto">
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSession?.id ?? null}
            onSelect={selectSession}
            onCreate={createSession}
            onDelete={deleteSession}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            AI Strategy
            <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              {' '}Backtester
            </span>
          </h1>

          {activeSession ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column */}
              <div className="lg:col-span-1 sticky top-6">
                <ChatPanel
                  session={activeSession}
                  onUpdate={handleUpdate}
                />
              </div>

              {/* Right Column */}
              <div className="lg:col-span-2 space-y-6">
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
                    <p className="text-gray-500 text-lg mb-2">
                      No backtest results yet
                    </p>
                    <p className="text-gray-600 text-sm">
                      Describe a strategy in the chat panel, then click "Run
                      Backtest"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-20">
              <p className="text-gray-500 text-lg mb-2">
                Select or create a chat
              </p>
              <p className="text-gray-600 text-sm">
                Use the sidebar to start a new conversation
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-dark-800 border-t border-dark-700">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-gray-400">
            &copy; 2026 AI Trading Platform. Built with React, TypeScript, Vite
            &amp; NestJS.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
