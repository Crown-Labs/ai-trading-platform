import { Injectable } from '@nestjs/common';
import { ConditionEngine } from './condition.engine';

export interface SignalResult {
  longEntry: boolean;
  longExit: boolean;
  shortEntry: boolean;
  shortExit: boolean;
}

@Injectable()
export class SignalEngine {
  constructor(private readonly conditionEngine: ConditionEngine) {}

  evaluate(
    index: number,
    indicatorValues: Record<string, number[]>,
    entryConditions: string[],
    exitConditions: string[],
    shortEntryConditions: string[],
    shortExitConditions: string[],
  ): SignalResult {
    return {
      longEntry: this.conditionEngine.evaluateAll(
        entryConditions,
        indicatorValues,
        index,
      ),
      longExit: this.conditionEngine.evaluateAll(
        exitConditions,
        indicatorValues,
        index,
      ),
      shortEntry:
        shortEntryConditions.length > 0 &&
        this.conditionEngine.evaluateAll(
          shortEntryConditions,
          indicatorValues,
          index,
        ),
      shortExit:
        shortExitConditions.length > 0 &&
        this.conditionEngine.evaluateAll(
          shortExitConditions,
          indicatorValues,
          index,
        ),
    };
  }
}
