import { evaluateCondition, ConditionVariables } from './condition-evaluator';

describe('ConditionEvaluator', () => {
  describe('simple conditions', () => {
    it('should evaluate "rsi < 30" as true when rsi is 25', () => {
      const variables: ConditionVariables = { rsi: 25 };
      expect(evaluateCondition('rsi < 30', variables)).toBe(true);
    });

    it('should evaluate "rsi < 30" as false when rsi is 35', () => {
      const variables: ConditionVariables = { rsi: 35 };
      expect(evaluateCondition('rsi < 30', variables)).toBe(false);
    });

    it('should evaluate "rsi > 70" as true when rsi is 80', () => {
      const variables: ConditionVariables = { rsi: 80 };
      expect(evaluateCondition('rsi > 70', variables)).toBe(true);
    });

    it('should evaluate "rsi >= 30" as true when rsi is 30', () => {
      const variables: ConditionVariables = { rsi: 30 };
      expect(evaluateCondition('rsi >= 30', variables)).toBe(true);
    });

    it('should evaluate "rsi <= 30" as true when rsi is 30', () => {
      const variables: ConditionVariables = { rsi: 30 };
      expect(evaluateCondition('rsi <= 30', variables)).toBe(true);
    });

    it('should evaluate "rsi == 50" correctly', () => {
      expect(evaluateCondition('rsi == 50', { rsi: 50 })).toBe(true);
      expect(evaluateCondition('rsi == 50', { rsi: 49 })).toBe(false);
    });

    it('should evaluate "rsi != 50" correctly', () => {
      expect(evaluateCondition('rsi != 50', { rsi: 49 })).toBe(true);
      expect(evaluateCondition('rsi != 50', { rsi: 50 })).toBe(false);
    });
  });

  describe('two-variable conditions', () => {
    it('should evaluate "ema_fast > ema_slow" as true when ema_fast is above ema_slow', () => {
      const variables: ConditionVariables = { ema_fast: 105, ema_slow: 100 };
      expect(evaluateCondition('ema_fast > ema_slow', variables)).toBe(true);
    });

    it('should evaluate "ema_fast > ema_slow" as false when ema_fast is below ema_slow', () => {
      const variables: ConditionVariables = { ema_fast: 95, ema_slow: 100 };
      expect(evaluateCondition('ema_fast > ema_slow', variables)).toBe(false);
    });

    it('should evaluate "close < open" correctly', () => {
      const variables: ConditionVariables = { close: 99, open: 100 };
      expect(evaluateCondition('close < open', variables)).toBe(true);
    });
  });

  describe('compound AND conditions', () => {
    it('should evaluate "rsi < 30 and ema_fast > ema_slow" as true when both hold', () => {
      const variables: ConditionVariables = { rsi: 25, ema_fast: 105, ema_slow: 100 };
      expect(evaluateCondition('rsi < 30 and ema_fast > ema_slow', variables)).toBe(true);
    });

    it('should evaluate "rsi < 30 and ema_fast > ema_slow" as false when first fails', () => {
      const variables: ConditionVariables = { rsi: 35, ema_fast: 105, ema_slow: 100 };
      expect(evaluateCondition('rsi < 30 and ema_fast > ema_slow', variables)).toBe(false);
    });

    it('should evaluate "rsi < 30 and ema_fast > ema_slow" as false when second fails', () => {
      const variables: ConditionVariables = { rsi: 25, ema_fast: 95, ema_slow: 100 };
      expect(evaluateCondition('rsi < 30 and ema_fast > ema_slow', variables)).toBe(false);
    });

    it('should evaluate "rsi < 30 and ema_fast > ema_slow" as false when both fail', () => {
      const variables: ConditionVariables = { rsi: 35, ema_fast: 95, ema_slow: 100 };
      expect(evaluateCondition('rsi < 30 and ema_fast > ema_slow', variables)).toBe(false);
    });
  });

  describe('math expression conditions', () => {
    it('should evaluate "close > ema_slow * 1.02" as true when close exceeds threshold', () => {
      const variables: ConditionVariables = { close: 103, ema_slow: 100 };
      expect(evaluateCondition('close > ema_slow * 1.02', variables)).toBe(true);
    });

    it('should evaluate "close > ema_slow * 1.02" as false when close is below threshold', () => {
      const variables: ConditionVariables = { close: 101, ema_slow: 100 };
      expect(evaluateCondition('close > ema_slow * 1.02', variables)).toBe(false);
    });

    it('should evaluate "close < ema_slow * 0.98" correctly', () => {
      const variables: ConditionVariables = { close: 97, ema_slow: 100 };
      expect(evaluateCondition('close < ema_slow * 0.98', variables)).toBe(true);
    });

    it('should handle addition in expressions', () => {
      const variables: ConditionVariables = { close: 105, ema_slow: 100 };
      expect(evaluateCondition('close > ema_slow + 3', variables)).toBe(true);
    });

    it('should handle subtraction in expressions', () => {
      const variables: ConditionVariables = { close: 96, ema_slow: 100 };
      expect(evaluateCondition('close < ema_slow - 3', variables)).toBe(true);
    });
  });

  describe('OR conditions', () => {
    it('should evaluate "rsi < 35 or rsi > 65" as true when first condition holds', () => {
      const variables: ConditionVariables = { rsi: 30 };
      expect(evaluateCondition('rsi < 35 or rsi > 65', variables)).toBe(true);
    });

    it('should evaluate "rsi < 35 or rsi > 65" as true when second condition holds', () => {
      const variables: ConditionVariables = { rsi: 70 };
      expect(evaluateCondition('rsi < 35 or rsi > 65', variables)).toBe(true);
    });

    it('should evaluate "rsi < 35 or rsi > 65" as false when neither holds', () => {
      const variables: ConditionVariables = { rsi: 50 };
      expect(evaluateCondition('rsi < 35 or rsi > 65', variables)).toBe(false);
    });

    it('should evaluate "rsi < 35 or rsi > 65" as true when both hold', () => {
      // Edge case: with different variables, both could hold
      const variables: ConditionVariables = { rsi: 20 };
      expect(evaluateCondition('rsi < 35 or rsi > 65', variables)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should throw on missing variable', () => {
      const variables: ConditionVariables = { rsi: 25 };
      expect(() => evaluateCondition('macd > 0', variables)).toThrow('Unknown variable: macd');
    });

    it('should throw on empty condition', () => {
      expect(() => evaluateCondition('', {})).toThrow('Empty condition');
    });

    it('should throw on whitespace-only condition', () => {
      expect(() => evaluateCondition('   ', {})).toThrow('Empty condition');
    });

    it('should throw on condition without comparison operator', () => {
      expect(() => evaluateCondition('rsi 30', { rsi: 30 })).toThrow('Invalid condition');
    });

    it('should throw on invalid expression with unknown variable on right side', () => {
      const variables: ConditionVariables = { rsi: 25 };
      expect(() => evaluateCondition('rsi > unknown_var', variables)).toThrow('Unknown variable: unknown_var');
    });
  });
});
