import { jest } from '@jest/globals';
import { PredictiveAnalytics } from '../../../services/PredictiveAnalytics.js';
import { NetworkMetrics } from '../../../models/NetworkMetrics.js';

jest.mock('../../../models/NetworkMetrics.js');

describe('PredictiveAnalytics Service', () => {
    let predictiveAnalytics;
    let mockData;

    beforeEach(() => {
        jest.clearAllMocks();
        predictiveAnalytics = new PredictiveAnalytics();
        mockData = Array.from({ length: 10 }, (_, i) => ({
            value: i * 10,
            timestamp: new Date(2023, 0, i + 1)
        }));
    });

    describe('Trend Analysis', () => {
        it('should detect increasing trend', async () => {
            const result = await predictiveAnalytics.analyzeTrend(mockData);
            expect(result.direction).toBe('up');
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should detect decreasing trend', async () => {
            mockData.reverse();
            const result = await predictiveAnalytics.analyzeTrend(mockData);
            expect(result.direction).toBe('down');
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should handle flat trend', async () => {
            const flatData = Array.from({ length: 10 }, () => ({
                value: 10,
                timestamp: new Date()
            }));
            const result = await predictiveAnalytics.analyzeTrend(flatData);
            expect(result.direction).toBe('stable');
        });

        it('should handle insufficient data', async () => {
            const result = await predictiveAnalytics.analyzeTrend([{ value: 1 }, { value: 2 }]);
            expect(result.direction).toBe('unknown');
        });
    });

    describe('Anomaly Detection', () => {
        it('should detect anomalies', async () => {
            const dataWithAnomaly = [
                ...Array.from({ length: 9 }, () => ({ value: 10, timestamp: new Date() })),
                { value: 100, timestamp: new Date() } // Anomaly
            ];
            const anomalies = await predictiveAnalytics.detectAnomalies(dataWithAnomaly);
            expect(anomalies).toHaveLength(1);
            expect(anomalies[0].value).toBe(100);
            expect(anomalies[0].severity).toBe('critical');
        });

        it('should not detect anomalies in normal data', async () => {
            const normalData = Array.from({ length: 10 }, () => ({
                value: 10,
                timestamp: new Date()
            }));
            const anomalies = await predictiveAnalytics.detectAnomalies(normalData);
            expect(anomalies).toHaveLength(0);
        });

        it('should handle empty data', async () => {
            const anomalies = await predictiveAnalytics.detectAnomalies([]);
            expect(anomalies).toHaveLength(0);
        });
    });

    describe('Forecasting', () => {
        it('should generate forecasts', async () => {
            const forecast = await predictiveAnalytics.generateForecast(mockData);
            expect(forecast.forecast).toHaveLength(5);
            expect(forecast.forecast[0]).toHaveProperty('value');
            expect(forecast.forecast[0]).toHaveProperty('confidence');
            expect(forecast.confidence).toBeLessThanOrEqual(1);
        });

        it('should handle insufficient data', async () => {
            const forecast = await predictiveAnalytics.generateForecast([{ value: 1 }, { value: 2 }]);
            expect(forecast).toHaveLength(0);
        });
    });

    describe('Metrics Processing', () => {
        it('should process valid metrics', async () => {
            const validMetrics = {
                deviceId: 'test-device',
                metrics: {
                    bandwidth: 100,
                    latency: 50,
                    packetLoss: 0.1,
                    jitter: 5
                }
            };
            const result = await predictiveAnalytics.processMetrics(validMetrics);
            expect(result.deviceId).toBe(validMetrics.deviceId);
            expect(result.trends).toBeDefined();
            expect(result.predictions).toBeDefined();
            expect(result.anomalies).toBeDefined();
        });

        it('should handle invalid metrics', async () => {
            const invalidMetrics = {
                deviceId: 'test-device'
            };
            await expect(predictiveAnalytics.processMetrics(invalidMetrics))
                .rejects
                .toThrow('Invalid metrics data');
        });
    });
});
