import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import ChatPanel from './components/ChatPanel';
import ChatSidebar from './components/ChatSidebar';
import StrategyDSLViewer from './components/StrategyDSLViewer';
import BacktestStats from './components/BacktestStats';
import BacktestChart from './components/BacktestChart';
import TradeTable from './components/TradeTable';
import BacktestHeatmap from './components/BacktestHeatmap';
import BacktestVersionNav from './components/BacktestVersionNav';
import { useAuth } from './hooks/useAuth';
import { useChatSessions } from './hooks/useChatSessions';
import { useTradeData } from './hooks/useTradeData';
import { ChatSession } from './types/chat';

const queryClient = new QueryClient();

function App() {
  const { user, isLoading: authLoading, login, logout } = useAuth();

  if (authLoading) {
    return (
      <div className="h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return <MainApp user={user} onLogout={logout} />;
}

function MainApp({
  user,
  onLogout,
}: {
  user: { id: string; email: string; name?: string; picture?: string };
  onLogout: () => void;
}) {
  const {
    sessions,
    activeSession,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
    addBacktestRun,
    setActiveRun,
  } = useChatSessions();

  const handleUpdate = (partial: Partial<ChatSession>) => {
    if (activeSession) {
      updateSession(activeSession.id, partial);
    }
  };

  const activeRun =
    activeSession?.backtestRuns?.find(
      (r) => r.id === activeSession.activeRunId,
    ) ?? null;
  const backtestResult = activeRun?.result ?? activeSession?.backtestResult ?? null;
  const strategy = activeRun?.strategy ?? activeSession?.strategy ?? null;

  // Load trades + candles from IndexedDB via React Query
  const { data: runData } = useTradeData(activeRun?.id);
  const trades = runData?.trades ?? [];
  const candles = runData?.candles ?? activeSession?.candles ?? [];

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">
      <Header user={user} onLogout={onLogout} />

      <div className="flex flex-1 overflow-hidden">
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

        {/* Left col: Chat */}
        <div
          className="flex-shrink-0 border-r border-dark-700 p-4 flex flex-col overflow-hidden"
          style={{ width: '520px' }}
        >
          {activeSession ? (
            <ChatPanel
              session={activeSession}
              onUpdate={handleUpdate}
              onAddRun={(run) => addBacktestRun(activeSession.id, run)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-gray-500 text-sm mb-1">
                Select or create a chat
              </p>
              <p className="text-gray-600 text-xs">
                Use the sidebar on the left
              </p>
            </div>
          )}
        </div>

        {/* Right col: Results */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSession && (
            <>
              {strategy && <StrategyDSLViewer strategy={strategy} />}

              {(activeSession.backtestRuns?.length ?? 0) > 0 && (
                <BacktestVersionNav
                  runs={activeSession.backtestRuns!}
                  activeRunId={activeSession.activeRunId}
                  onSelect={(runId) =>
                    setActiveRun(activeSession.id, runId)
                  }
                />
              )}

              {backtestResult && (
                <>
                  <BacktestStats metrics={backtestResult.metrics} />
                  <BacktestHeatmap trades={trades} />
                  {candles.length > 0 && (
                    <BacktestChart
                      candles={candles}
                      trades={trades}
                      symbol={strategy?.market?.symbol ?? 'BTCUSDT'}
                      defaultTimeframe={strategy?.market?.timeframe ?? '1h'}
                      startDate={activeRun?.startDate ?? strategy?.startDate}
                      endDate={activeRun?.endDate ?? strategy?.endDate}
                    />
                  )}
                  <TradeTable trades={trades} />
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

export default AppWithProviders;
