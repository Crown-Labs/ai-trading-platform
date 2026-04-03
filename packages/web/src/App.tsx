import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import YAML from 'yaml';
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
      <div className="h-screen bg-dark-900 flex items-center justify-center font-mono">
        <div className="text-muted text-xs">Loading...</div>
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dslExpanded, setDslExpanded] = useState(true);

  const handleUpdate = (partial: Partial<ChatSession>) => {
    if (activeSession) {
      updateSession(activeSession.id, partial);
    }
  };

  const activeRun =
    activeSession?.backtestRuns?.find((r) => r.id === activeSession.activeRunId) ?? null;
  const backtestResult = activeRun?.result ?? activeSession?.backtestResult ?? null;
  const strategy = activeRun?.strategy ?? activeSession?.strategy ?? null;

  const { data: runData } = useTradeData(activeRun?.id);
  const trades = runData?.trades ?? [];
  const candles = runData?.candles ?? activeSession?.candles ?? [];

  const strategyYaml = strategy
    ? YAML.stringify({
        strategy: { name: strategy.name },
        market: strategy.market,
        indicator: strategy.indicator,
        entry: strategy.entry,
        exit: strategy.exit,
        risk: strategy.risk,
        ...(strategy.execution && { execution: strategy.execution }),
      })
    : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dark-900 font-mono">
      <Header
        user={user}
        onLogout={onLogout}
        activeSession={activeSession}
        activeRun={activeRun}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="flex-shrink-0 transition-all duration-200 overflow-hidden"
          style={{ width: sidebarCollapsed ? '44px' : '190px' }}
        >
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSession?.id ?? null}
            onSelect={selectSession}
            onCreate={createSession}
            onDelete={deleteSession}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          />
        </div>

        {/* Chat Panel */}
        <div
          className="flex-shrink-0 border-r border-dark-700 overflow-hidden"
          style={{ width: '360px' }}
        >
          {activeSession ? (
            <ChatPanel
              session={activeSession}
              onUpdate={handleUpdate}
              onAddRun={(run) => addBacktestRun(activeSession.id, run)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 bg-dark-800">
              <p className="text-muted text-xs mb-1">Select or create a chat</p>
              <p className="text-muted/60 text-[11px]">Use the sidebar on the left</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeSession ? (
            <>
              {/* Version Nav */}
              {(activeSession.backtestRuns?.length ?? 0) > 0 && (
                <BacktestVersionNav
                  runs={activeSession.backtestRuns!}
                  activeRunId={activeSession.activeRunId}
                  onSelect={(runId) => setActiveRun(activeSession.id, runId)}
                />
              )}

              {/* Strategy Strip */}
              {strategy && <StrategyDSLViewer strategy={strategy} />}

              {backtestResult ? (
                <>
                  {/* Top Row: Chart | RightStack */}
                  <div
                    className="flex border-b border-dark-700 overflow-hidden"
                    style={{ flex: '0 0 52%', minHeight: 0 }}
                  >
                    {/* Chart Card */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between px-3.5 py-2 border-b border-dark-700 bg-dark-800 flex-shrink-0">
                        <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-wider">
                          <span>Equity Curve</span>
                          {strategy && (
                            <span className="text-gray-200 text-[12px] normal-case font-semibold tracking-normal">
                              {strategy.name}
                            </span>
                          )}
                          {strategy && (
                            <span className="bg-dark-700 border border-dark-700 text-accent text-[10px] px-1.5 py-0.5 rounded">
                              {strategy.market.symbol} · {strategy.market.timeframe}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {candles.length > 0 ? (
                          <BacktestChart
                            candles={candles}
                            trades={trades}
                            symbol={strategy?.market?.symbol ?? 'BTCUSDT'}
                            defaultTimeframe={strategy?.market?.timeframe ?? '1h'}
                            startDate={activeRun?.startDate ?? strategy?.startDate}
                            endDate={activeRun?.endDate ?? strategy?.endDate}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted text-xs">
                            No chart data available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Stack: Stats + DSL collapsible */}
                    <div
                      className="flex flex-col overflow-hidden border-l border-dark-700 flex-shrink-0"
                      style={{ width: '280px' }}
                    >
                      <div className="flex items-center px-3 py-2 border-b border-dark-700 bg-dark-800 flex-shrink-0">
                        <span className="text-[10px] text-muted uppercase tracking-wider">
                          Performance Stats
                        </span>
                      </div>
                      <BacktestStats metrics={backtestResult.metrics} />

                      {/* DSL Collapsible */}
                      {strategyYaml && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <button
                            onClick={() => setDslExpanded((e) => !e)}
                            className="flex items-center justify-between px-3 py-2 border-b border-dark-700 text-[10px] text-muted uppercase tracking-wider cursor-pointer hover:text-gray-200 w-full bg-dark-800 flex-shrink-0 transition-colors"
                          >
                            <span>Strategy DSL</span>
                            <span>{dslExpanded ? '▾' : '▸'}</span>
                          </button>
                          {dslExpanded && (
                            <div className="flex-1 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed bg-dark-900">
                              {strategyYaml.split('\n').map((line, i) => {
                                const colonIdx = line.indexOf(':');
                                const indent = line.match(/^(\s*)/)?.[1] ?? '';
                                if (colonIdx > 0) {
                                  const key = line.slice(indent.length, colonIdx);
                                  const val = line.slice(colonIdx + 1);
                                  return (
                                    <div key={i}>
                                      <span style={{ paddingLeft: indent.length * 4 + 'px' }}>
                                        <span style={{ color: '#fcd34d' }}>{key}:</span>
                                        <span style={{ color: '#6ee7b7' }}>{val}</span>
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={i} style={{ color: 'var(--muted)', paddingLeft: indent.length * 4 + 'px' }}>
                                    {line.slice(indent.length) || '\u00a0'}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Heatmap | Trades */}
                  <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 border-r border-dark-700 overflow-hidden flex flex-col">
                      <BacktestHeatmap trades={trades} />
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <TradeTable trades={trades} />
                    </div>
                  </div>
                </>
              ) : (
                !strategy && (
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <div>
                      <p className="text-muted text-sm mb-1">No backtest results yet</p>
                      <p className="text-muted/60 text-xs">
                        Describe a strategy in the chat panel, then click Run Backtest
                      </p>
                    </div>
                  </div>
                )
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">
              Select a session to begin
            </div>
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
