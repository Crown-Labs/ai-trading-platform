import { openDB, IDBPDatabase } from 'idb';
import { Trade, OHLCVCandle, BacktestDataRange } from '@ai-trading/shared';

const DB_NAME = 'ai-trading-db';
const DB_VERSION = 1;
const STORE_RUNS = 'run-data';

export interface RunData {
  runId: string;
  trades: Trade[];
  candles: OHLCVCandle[];
  dataRange?: BacktestDataRange;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_RUNS)) {
          db.createObjectStore(STORE_RUNS, { keyPath: 'runId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveRunData(data: RunData): Promise<void> {
  const db = await getDB();
  await db.put(STORE_RUNS, data);
}

export async function getRunData(runId: string): Promise<RunData | undefined> {
  const db = await getDB();
  return db.get(STORE_RUNS, runId);
}

export async function deleteRunData(runId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_RUNS, runId);
}

export async function deleteRunsForSession(runIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_RUNS, 'readwrite');
  await Promise.all(runIds.map((id) => tx.store.delete(id)));
  await tx.done;
}
