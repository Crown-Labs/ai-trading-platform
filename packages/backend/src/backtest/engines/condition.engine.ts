import { Injectable } from '@nestjs/common';
import { IndicatorsService } from '../../indicators/indicators.service';

@Injectable()
export class ConditionEngine {
  constructor(private readonly indicators: IndicatorsService) {}

  evaluate(
    condition: string,
    indicatorValues: Record<string, number[]>,
    index: number,
  ): boolean {
    try {
      // Handle crossover(a, b) and crossunder(a, b)
      const crossMatch = condition.match(
        /cross(over|under)\((\w+),\s*(\w+)\)/i,
      );
      if (crossMatch) {
        const type = crossMatch[1].toLowerCase();
        const a = indicatorValues[crossMatch[2]];
        const b = indicatorValues[crossMatch[3]];
        if (!a || !b) return false;
        if (type === 'over')
          return this.indicators.isCrossover(a, b, index);
        if (type === 'under')
          return this.indicators.isCrossunder(a, b, index);
      }

      // Build vars at this index
      const vars: Record<string, number> = {};
      for (const [key, values] of Object.entries(indicatorValues)) {
        const val = values[index];
        if (val === undefined || isNaN(val)) return false;
        vars[key] = val;
      }

      // Replace and/or with &&/||
      let expr = condition
        .replace(/\band\b/gi, '&&')
        .replace(/\bor\b/gi, '||');

      // Replace variables (longest first)
      const varNames = Object.keys(vars).sort(
        (a, b) => b.length - a.length,
      );
      for (const name of varNames) {
        expr = expr.replace(
          new RegExp(`\\b${name}\\b`, 'g'),
          String(vars[name]),
        );
      }

      return new Function(`"use strict"; return (${expr});`)() as boolean;
    } catch {
      return false;
    }
  }

  evaluateAll(
    conditions: string[],
    indicatorValues: Record<string, number[]>,
    index: number,
  ): boolean {
    return conditions.every((cond) =>
      this.evaluate(cond, indicatorValues, index),
    );
  }
}
