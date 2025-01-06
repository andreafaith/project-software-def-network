import PredictiveAnalytics from '../../services/PredictiveAnalytics.js';
import NetworkMetrics from '../../models/NetworkMetrics.js';

jest.mock('../../models/NetworkMetrics.js');

describe('PredictiveAnalytics Service', () => {
    let predictiveAnalytics;

    beforeEach(() => {
        predictiveAnalytics = new PredictiveAnalytics({
            trendThreshold: 0.1,
            minDataPoints: 2,
            anomalyThreshold: 2,
            minConfidence: 0.7
        });
    });

    describe('Data Processing', () => {
        test('should process network metrics correctly', async () => {
            const metrics = [
                { timestamp: new Date('2025-01-01'), bandwidth: 100, latency: 50 },
                { timestamp: new Date('2025-01-02'), bandwidth: 120, latency: 45 },
                { timestamp: new Date('2025-01-03'), bandwidth: 110, latency: 48 }
            ];

            const result = await predictiveAnalytics.processMetrics(metrics);
            expect(result).toBeDefined();
            expect(result.trends).toBeDefined();
            expect(result.anomalies).toBeDefined();
            expect(result.predictions).toBeDefined();
        });

        test('should handle invalid metrics', async () => {
            const invalidMetrics = null;
            await expect(predictiveAnalytics.processMetrics(invalidMetrics))
                .rejects.toThrow('Invalid metrics data');
        });
    });

    describe('Anomaly Detection', () => {
        test('should detect bandwidth anomalies', async () => {
            const metrics = [
                { timestamp: new Date('2025-01-01'), bandwidth: 100 },
                { timestamp: new Date('2025-01-02'), bandwidth: 500 }, // Anomaly
                { timestamp: new Date('2025-01-03'), bandwidth: 110 }
            ];

            const result = await predictiveAnalytics.processMetrics(metrics);
            expect(result.anomalies).toBeDefined();
            expect(result.anomalies.length).toBeGreaterThan(0);
            expect(result.anomalies[0].metric).toBe('bandwidth');
        });

        test('should detect latency spikes', async () => {
            const metrics = [
                { timestamp: new Date('2025-01-01'), latency: 50 },
                { timestamp: new Date('2025-01-02'), latency: 200 }, // Spike
                { timestamp: new Date('2025-01-03'), latency: 45 }
            ];

            const result = await predictiveAnalytics.processMetrics(metrics);
            expect(result.anomalies).toBeDefined();
            expect(result.anomalies.length).toBeGreaterThan(0);
            expect(result.anomalies[0].metric).toBe('latency');
        });
    });

    describe('Trend Analysis', () => {
        test('should analyze trends over time', async () => {
            const metrics = [
                { timestamp: new Date('2025-01-01'), bandwidth: 100 },
                { timestamp: new Date('2025-01-02'), bandwidth: 120 },
                { timestamp: new Date('2025-01-03'), bandwidth: 140 }
            ];

            const result = await predictiveAnalytics.processMetrics(metrics);
            expect(result.trends).toBeDefined();
            expect(result.trends.bandwidth).toBeDefined();
            expect(result.trends.bandwidth.direction).toBe('increasing');
        });

        test('should handle insufficient data', async () => {
            const metrics = [
                { timestamp: new Date('2025-01-01'), bandwidth: 100 }
            ];

            const result = await predictiveAnalytics.processMetrics(metrics);
            expect(result.trends.bandwidth).toBeUndefined();
        });
    });

    describe('Prediction Generation', () => {
        test('should generate future predictions', async () => {
            const metrics = [
                { timestamp: new Date('2025-01-01'), bandwidth: 100 },
                { timestamp: new Date('2025-01-02'), bandwidth: 120 },
                { timestamp: new Date('2025-01-03'), bandwidth: 140 }
            ];

            const result = await predictiveAnalytics.processMetrics(metrics);
            expect(result.predictions).toBeDefined();
            expect(result.predictions.length).toBeGreaterThan(0);
            expect(result.predictions[0].metric).toBe('bandwidth');
        });

        test('should include confidence intervals', async () => {
            const metrics = [
                { timestamp: new Date('2025-01-01'), bandwidth: 100 },
                { timestamp: new Date('2025-01-02'), bandwidth: 120 },
                { timestamp: new Date('2025-01-03'), bandwidth: 140 }
            ];

            const result = await predictiveAnalytics.processMetrics(metrics);
            expect(result.predictions[0].confidence).toBeDefined();
            expect(result.predictions[0].confidence).toBeGreaterThanOrEqual(0);
            expect(result.predictions[0].confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('Alert Generation', () => {
        test('should generate alerts for anomalies', async () => {
            const metrics = [
                { timestamp: new Date('2025-01-01'), bandwidth: 100 },
                { timestamp: new Date('2025-01-02'), bandwidth: 500 }, // Anomaly
                { timestamp: new Date('2025-01-03'), bandwidth: 110 }
            ];

            const result = await predictiveAnalytics.processMetrics(metrics);
            expect(result.anomalies).toBeDefined();
            expect(result.anomalies.length).toBeGreaterThan(0);
            expect(result.anomalies[0].severity).toBeDefined();
        });

        test('should prioritize alerts correctly', async () => {
            const metrics = [
                { timestamp: new Date('2025-01-01'), bandwidth: 100 },
                { timestamp: new Date('2025-01-02'), bandwidth: 1000 }, // Critical anomaly
                { timestamp: new Date('2025-01-03'), bandwidth: 110 }
            ];

            const result = await predictiveAnalytics.processMetrics(metrics);
            expect(result.anomalies[0].severity).toBe('critical');
        });
    });

    describe('Performance', () => {
        test('should process large datasets efficiently', async () => {
            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                timestamp: new Date(2025, 0, 1 + i),
                bandwidth: 100 + Math.random() * 20,
                latency: 50 + Math.random() * 10
            }));

            const startTime = Date.now();
            const result = await predictiveAnalytics.processMetrics(largeDataset);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(result).toBeDefined();
        });

        test('should handle concurrent requests', async () => {
            const metrics = Array.from({ length: 10 }, () => ({
                timestamp: new Date(),
                bandwidth: 100 + Math.random() * 20,
                latency: 50 + Math.random() * 10
            }));

            const promises = Array.from({ length: 5 }, () => 
                predictiveAnalytics.processMetrics(metrics)
            );

            const results = await Promise.all(promises);
            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.trends).toBeDefined();
            });
        });
    });
});
