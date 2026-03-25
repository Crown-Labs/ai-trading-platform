import { useQuery } from '@tanstack/react-query';
import { getRunData, RunData } from '../lib/trade-store';

export function useTradeData(runId: string | null | undefined) {
  return useQuery<RunData | undefined>({
    queryKey: ['run-data', runId],
    queryFn: () => (runId ? getRunData(runId) : Promise.resolve(undefined)),
    enabled: !!runId,
    staleTime: Infinity,   // IDB data never stale — only changes on new backtest
    gcTime: 1000 * 60 * 30, // keep in memory 30min
  });
}
