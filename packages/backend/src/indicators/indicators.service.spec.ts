import { IndicatorsService } from './indicators.service';

describe('Issue #2 — IndicatorsService', () => {
  let service: IndicatorsService;

  beforeEach(() => {
    service = new IndicatorsService();
  });

  const sampleCloses = [
    44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
    45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64,
    46.21, 46.25, 45.71, 46.45, 45.78, 45.35, 44.03, 44.18, 44.22, 44.57,
    43.42, 42.66, 43.13,
  ];

  describe('calculateRSI', () => {
    it('returns values in [0, 100]', () => {
      const result = service.calculateRSI(sampleCloses, 14);
      const defined = result.filter((v) => !isNaN(v));
      expect(defined.length).toBeGreaterThan(0);
      for (const val of defined) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('calculateEMA', () => {
    it('output length matches input', () => {
      const result = service.calculateEMA(sampleCloses, 10);
      expect(result.length).toBe(sampleCloses.length);
    });
  });

  describe('calculateSMA', () => {
    it('computes correct average for simple case', () => {
      const data = [10, 20, 30, 40, 50];
      const result = service.calculateSMA(data, 3);
      // SMA(3) at index 2 should be (10+20+30)/3 = 20
      const defined = result.filter((v) => !isNaN(v));
      expect(defined.length).toBeGreaterThan(0);
      // Last SMA(3) = (30+40+50)/3 = 40
      expect(defined[defined.length - 1]).toBeCloseTo(40, 1);
    });
  });

  describe('isCrossover', () => {
    it('detects crossover correctly', () => {
      const fast = [10, 15, 20, 25];
      const slow = [12, 16, 18, 22];
      // At index 2: prev fast(15) <= prev slow(16) and curr fast(20) > curr slow(18) → true
      expect(service.isCrossover(fast, slow, 2)).toBe(true);
    });

    it('returns false when no crossover', () => {
      const fast = [20, 25, 30];
      const slow = [10, 12, 14];
      // fast always above slow, no crossover
      expect(service.isCrossover(fast, slow, 2)).toBe(false);
    });

    it('returns false at index 0', () => {
      expect(service.isCrossover([10], [5], 0)).toBe(false);
    });
  });

  describe('isCrossunder', () => {
    it('detects crossunder correctly', () => {
      const fast = [20, 16, 14];
      const slow = [18, 15, 17];
      // At index 2: prev fast(16) >= prev slow(15) and curr fast(14) < curr slow(17) → true
      expect(service.isCrossunder(fast, slow, 2)).toBe(true);
    });

    it('returns false when no crossunder', () => {
      const fast = [10, 12, 14];
      const slow = [20, 25, 30];
      // fast always below slow, prev1 < prev2 so no crossunder
      expect(service.isCrossunder(fast, slow, 2)).toBe(false);
    });
  });
});
