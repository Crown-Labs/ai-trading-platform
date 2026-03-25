import { Injectable } from '@nestjs/common';
import { Trade } from '@ai-trading/shared';

export interface ExecutionParams {
  commission: number;
  slippage: number;
  leverage: number;
  positionSize: number;
}

@Injectable()
export class ExecutionEngine {
  closeLong(
    entryPrice: number,
    exitPrice: number,
    entryTime: string,
    exitTime: string,
    tradeId: number,
    params: ExecutionParams,
    capital: number,
  ): Trade {
    const effectiveEntry = entryPrice * (1 + params.slippage);
    const effectiveExit = exitPrice * (1 - params.slippage);
    const positionValue =
      capital * (params.positionSize / 100) * params.leverage;
    const fee = positionValue * params.commission * 2;
    const rawPnl =
      ((effectiveExit - effectiveEntry) / effectiveEntry) * positionValue;
    const netPnl = rawPnl - fee;
    const netPnlPercent = (netPnl / capital) * 100;

    const sign = netPnlPercent >= 0 ? '+' : '\u2212';

    return {
      id: tradeId,
      entryTime,
      exitTime,
      entryPrice,
      exitPrice,
      side: 'long',
      pnl: parseFloat(netPnl.toFixed(2)),
      pnlPercent: `${sign}${Math.abs(netPnlPercent).toFixed(2)}%`,
      fees: parseFloat(fee.toFixed(2)),
      isWin: netPnl > 0,
    };
  }

  closeShort(
    entryPrice: number,
    exitPrice: number,
    entryTime: string,
    exitTime: string,
    tradeId: number,
    params: ExecutionParams,
    capital: number,
  ): Trade {
    const effectiveEntry = entryPrice * (1 - params.slippage);
    const effectiveExit = exitPrice * (1 + params.slippage);
    const positionValue =
      capital * (params.positionSize / 100) * params.leverage;
    const fee = positionValue * params.commission * 2;
    const rawPnl =
      ((effectiveEntry - effectiveExit) / effectiveEntry) * positionValue;
    const netPnl = rawPnl - fee;
    const netPnlPercent = (netPnl / capital) * 100;

    const sign = netPnlPercent >= 0 ? '+' : '\u2212';

    return {
      id: tradeId,
      entryTime,
      exitTime,
      entryPrice,
      exitPrice,
      side: 'short',
      pnl: parseFloat(netPnl.toFixed(2)),
      pnlPercent: `${sign}${Math.abs(netPnlPercent).toFixed(2)}%`,
      fees: parseFloat(fee.toFixed(2)),
      isWin: netPnl > 0,
    };
  }
}
