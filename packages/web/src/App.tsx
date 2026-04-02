import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import ChatSidebar from './components/ChatSidebar';
import StrategyDSLViewer from './components/StrategyDSLViewer';
import BacktestStats from './components/BacktestStats';
import BacktestChart from './components/BacktestChart';
import TradeTable from './components/TradeTable';
import BacktestHeatmap from './components/BacktestHeatmap';
import BacktestVersionNav from './components/BacktestVersionNav';
import { useChatSessions } from './hooks/useChatSessions';
import { useTradeData } from './hooks/useTradeData';
import { ChatSession } from './types/chat';

const queryClient = new QueryClient();

function App() {
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
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Header activeSession={activeSession} activeRun={activeRun} />

      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible sidebar — manages its own width */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSession?.id ?? null}
          onSelect={selectSession}
          onCreate={createSession}
          onDelete={deleteSession}
        />

        {/* Chat panel (360px) */}
        <div
          className="flex-shrink-0 border-r border-terminal-border flex flex-col overflow-hidden bg-terminal-surface"
          style={{ width: '360px' }}
        >
          {activeSession ? (
            <ChatPanel
              session={activeSession}
              onUpdate={handleUpdate}
              onAddRun={(run) => addBacktestRun(activeSession.id, run)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-terminal-muted" style={{ fontSize: '13px' }}>
                Select or create a chat
              </p>
              <p className="text-terminal-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                Use the sidebar on the left
              </p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeSession && (
            <>
              {/* Version nav — full width, flex-shrink-0 */}
              {(activeSession.backtestRuns?.length ?? 0) > 0 && (
                <BacktestVersionNav
                  runs={activeSession.backtestRuns!}
                  activeRunId={activeSession.activeRunId}
                  onSelect={(runId) => setActiveRun(activeSession.id, runId)}
                />
              )}

              {backtestResult ? (
                <>
                  {/* Top row: 52% height */}
                  <div
                    className="flex border-b border-terminal-border overflow-hidden"
                    style={{ flex: '0 0 52%', minHeight: 0 }}
                  >
                    {/* Chart card */}
                    <div className="flex-1 flex flex-col overflow-hidden">
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
                    </div>

                    {/* Right stack: stats + DSL (300px) */}
                    <div
                      className="flex flex-col overflow-hidden border-l border-terminal-border"
                      style={{ width: '300px', minWidth: '300px' }}
                    >
                      <BacktestStats metrics={backtestResult.metrics} />
                      {strategy && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                          <StrategyDSLViewer strategy={strategy} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex flex-1 overflow-hidden" style={{ minHeight: '180px' }}>
                    {/* Heatmap */}
                    <div className="flex-1 flex flex-col overflow-hidden border-r border-terminal-border">
                      <BacktestHeatmap trades={trades} />
                    </div>
                    {/* Trades */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <TradeTable trades={trades} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {strategy ? (
                    <>
                      {/* Show DSL viewer even before first backtest */}
                      <div className="flex-1 overflow-y-auto">
                        <StrategyDSLViewer strategy={strategy} />
                      </div>
                      <div className="flex-shrink-0 border-t border-terminal-border flex items-center justify-center" style={{ padding: '12px' }}>
                        <p className="text-terminal-muted" style={{ fontSize: '11px' }}>
                          Strategy loaded — configure dates and run backtest
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-terminal-muted" style={{ fontSize: '12px' }}>
                        No backtest results yet
                      </p>
                    </div>
                  )}
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
