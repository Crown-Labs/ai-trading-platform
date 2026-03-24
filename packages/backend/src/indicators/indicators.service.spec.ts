import { IndicatorsService } from './indicators.service';

describe('IndicatorsService', () => {
  let service: IndicatorsService;

  beforeEach(() => {
    service = new IndicatorsService();
  });

  // Generate sample price data
  const sampleCloses = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 3) * 10);

  describe('calculateRSI()', () => {
    it('should return array of correct length', () => {
      const result = service.calculateRSI(sampleCloses, 14);
      expect(Array.isArray(result)).toBe(true);
      // Library strips warmup period, so length = input - period
      expect(result.length).toBe(sampleCloses.length - 14);
    });

    it('should return values in valid RSI range [0, 100] for non-NaN entries', () => {
      const result = service.calculateRSI(sampleCloses, 14);
      const validValues = result.filter((v) => !isNaN(v));
      for (const v of validValues) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('calculateEMA()', () => {
    it('should return array of correct length (same as input)', () => {
      const result = service.calculateEMA(sampleCloses, 10);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(sampleCloses.length);
    });
  });

  describe('calculateSMA()', () => {
    it('should return array of correct length', () => {
      const result = service.calculateSMA(sampleCloses, 5);
      expect(Array.isArray(result)).toBe(true);
      // Library strips warmup period, so length = input - (period - 1)
      expect(result.length).toBe(sampleCloses.length - (5 - 1));
    });

    it('should compute correct average for simple case', () => {
      const data = [10, 20, 30, 40, 50];
      const result = service.calculateSMA(data, 3);
      // SMA(3) for last value: (30+40+50)/3 = 40
      const validValues = result.filter((v) => !isNaN(v));
      expect(validValues.length).toBeGreaterThan(0);
      // The last valid SMA should be (30+40+50)/3 = 40
      expect(validValues[validValues.length - 1]).toBeCloseTo(40, 1);
    });
  });

  describe('isCrossover()', () => {
    it('should detect when series1 crosses above series2', () => {
      const series1 = [5, 8, 12]; // crosses above at index 2
      const series2 = [10, 10, 10];
      expect(service.isCrossover(series1, series2, 2)).toBe(true);
    });

    it('should return false when no crossover', () => {
      const series1 = [5, 6, 7];
      const series2 = [10, 10, 10];
      expect(service.isCrossover(series1, series2, 2)).toBe(false);
    });

    it('should return false for index 0', () => {
      const series1 = [12];
      const series2 = [10];
      expect(service.isCrossover(series1, series2, 0)).toBe(false);
    });
  });

  describe('isCrossunder()', () => {
    it('should detect when series1 crosses below series2', () => {
      const series1 = [12, 10, 8]; // crosses below at index 2
      const series2 = [10, 10, 10];
      expect(service.isCrossunder(series1, series2, 2)).toBe(true);
    });

    it('should return false when no crossunder', () => {
      const series1 = [15, 14, 13];
      const series2 = [10, 10, 10];
      expect(service.isCrossunder(series1, series2, 2)).toBe(false);
    });

    it('should return false for index 0', () => {
      const series1 = [5];
      const series2 = [10];
      expect(service.isCrossunder(series1, series2, 0)).toBe(false);
    });
  });
});
