import { jest } from '@jest/globals';
import { PredictiveAnalytics } from '../../services/PredictiveAnalytics.js';
import NetworkMetrics from '../../models/NetworkMetrics.js';

// Mock NetworkMetrics
jest.mock('../../models/NetworkMetrics.js', () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        aggregate: jest.fn()
    }
}));

describe('PredictiveAnalytics Service', () => {
    let predictiveAnalytics;

    beforeEach(() => {
        predictiveAnalytics = new PredictiveAnalytics();
        jest.clearAllMocks();
    });

    describe('Trend Analysis', () => {
        it('should detect increasing trend', async () => {
            const data = [
                { timestamp: new Date('2025-01-01'), value: 10 },
                { timestamp: new Date('2025-01-02'), value: 20 },
                { timestamp: new Date('2025-01-03'), value: 30 }
            ];
            const trend = await predictiveAnalytics.analyzeTrend(data);
            expect(trend.direction).toBe('increasing');
            expect(trend.confidence).toBeGreaterThan(0.5);
        });

        it('should detect decreasing trend', async () => {
            const data = [
                { timestamp: new Date('2025-01-01'), value: 30 },
                { timestamp: new Date('2025-01-02'), value: 20 },
                { timestamp: new Date('2025-01-03'), value: 10 }
            ];
            const trend = await predictiveAnalytics.analyzeTrend(data);
            expect(trend.direction).toBe('decreasing');
            expect(trend.confidence).toBeGreaterThan(0.5);
        });

        it('should handle flat trend', async () => {
            const data = [
                { timestamp: new Date('2025-01-01'), value: 10 },
                { timestamp: new Date('2025-01-02'), value: 10 },
                { timestamp: new Date('2025-01-03'), value: 10 }
            ];
            const trend = await predictiveAnalytics.analyzeTrend(data);
            expect(trend.direction).toBe('stable');
            expect(trend.confidence).toBeGreaterThan(0.5);
        });
    });

    describe('Anomaly Detection', () => {
        it('should detect anomalies', async () => {
            const data = [
                { timestamp: new Date('2025-01-01'), value: 10 },
                { timestamp: new Date('2025-01-02'), value: 12 },
                { timestamp: new Date('2025-01-03'), value: 50 }, // Anomaly
                { timestamp: new Date('2025-01-04'), value: 11 }
            ];
            const anomalies = await predictiveAnalytics.detectAnomalies(data);
            expect(anomalies.length).toBe(1);
            expect(anomalies[0].timestamp).toEqual(new Date('2025-01-03'));
        });

        it('should not detect anomalies in normal data', async () => {
            const data = [
                { timestamp: new Date('2025-01-01'), value: 10 },
                { timestamp: new Date('2025-01-02'), value: 12 },
                { timestamp: new Date('2025-01-03'), value: 11 },
                { timestamp: new Date('2025-01-04'), value: 13 }
            ];
            const anomalies = await predictiveAnalytics.detectAnomalies(data);
            expect(anomalies.length).toBe(0);
        });

        it('should handle empty data', async () => {
            const anomalies = await predictiveAnalytics.detectAnomalies([]);
            expect(anomalies.length).toBe(0);
        });
    });

    describe('Forecasting', () => {
        it('should generate forecasts', async () => {
            const data = [
                { timestamp: new Date('2025-01-01'), value: 10 },
                { timestamp: new Date('2025-01-02'), value: 20 },
                { timestamp: new Date('2025-01-03'), value: 30 }
            ];
            const forecast = await predictiveAnalytics.generateForecast(data, 2);
            expect(forecast.length).toBe(2);
            expect(forecast[0].value).toBeGreaterThan(30);
        });

        it('should maintain trend direction in forecasts', async () => {
            const data = [
                { timestamp: new Date('2025-01-01'), value: 10 },
                { timestamp: new Date('2025-01-02'), value: 20 },
                { timestamp: new Date('2025-01-03'), value: 30 }
            ];
            const forecast = await predictiveAnalytics.generateForecast(data, 2);
            expect(forecast[1].value).toBeGreaterThan(forecast[0].value);
        });

        it('should handle insufficient data', async () => {
            const data = [{ timestamp: new Date('2025-01-01'), value: 10 }];
            const forecast = await predictiveAnalytics.generateForecast(data, 2);
            expect(forecast.length).toBe(0);
        });
    });

    describe('Pattern Recognition', () => {
        it('should detect patterns', async () => {
            const data = [
                { timestamp: new Date('2025-01-01'), value: 10 },
                { timestamp: new Date('2025-01-02'), value: 20 },
                { timestamp: new Date('2025-01-03'), value: 10 },
                { timestamp: new Date('2025-01-04'), value: 20 }
            ];
            const patterns = await predictiveAnalytics.detectPatterns(data);
            expect(patterns.length).toBeGreaterThan(0);
            expect(patterns[0].type).toBe('cyclic');
        });

        it('should not detect patterns in random data', async () => {
            const data = Array.from({ length: 10 }, (_, i) => ({
                timestamp: new Date(`2025-01-${i + 1}`),
                value: Math.random() * 100
            }));
            const patterns = await predictiveAnalytics.detectPatterns(data);
            expect(patterns.length).toBe(0);
        });
    });
});
