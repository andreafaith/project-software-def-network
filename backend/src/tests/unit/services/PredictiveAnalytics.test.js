import { jest } from '@jest/globals';
import PredictiveAnalytics from '../../../services/PredictiveAnalytics.js';
import mongoose from 'mongoose';

describe('PredictiveAnalytics Service', () => {
    describe('Data Processing', () => {
        it('should process network metrics correctly', async () => {
            const metrics = {
                bandwidth: 100,
                latency: 50,
                errors: 0,
                timestamp: new Date()
            };

            const result = await PredictiveAnalytics.processMetrics(metrics);
            expect(result).toHaveProperty('processed');
            expect(result.processed).toBe(true);
        });

        it('should handle invalid metrics', async () => {
            const metrics = {
                bandwidth: 'invalid',
                latency: -1
            };

            await expect(
                PredictiveAnalytics.processMetrics(metrics)
            ).rejects.toThrow();
        });
    });

    describe('Anomaly Detection', () => {
        it('should detect bandwidth anomalies', async () => {
            const metrics = {
                bandwidth: 1000, // Unusually high
                latency: 50,
                timestamp: new Date()
            };

            const result = await PredictiveAnalytics.detectAnomalies(metrics);
            expect(result).toHaveProperty('anomalies');
            expect(result.anomalies).toContain('bandwidth');
        });

        it('should detect latency spikes', async () => {
            const metrics = {
                bandwidth: 100,
                latency: 500, // High latency
                timestamp: new Date()
            };

            const result = await PredictiveAnalytics.detectAnomalies(metrics);
            expect(result).toHaveProperty('anomalies');
            expect(result.anomalies).toContain('latency');
        });
    });

    describe('Trend Analysis', () => {
        it('should analyze trends over time', async () => {
            const data = [
                { bandwidth: 100, timestamp: new Date('2025-01-01') },
                { bandwidth: 110, timestamp: new Date('2025-01-02') }
            ];

            const result = await PredictiveAnalytics.analyzeTrends(data);
            expect(result).toHaveProperty('trend');
            expect(result.trend).toBeGreaterThan(0);
        });

        it('should handle insufficient data', async () => {
            const data = [
                { bandwidth: 100, timestamp: new Date() }
            ];

            await expect(
                PredictiveAnalytics.analyzeTrends(data)
            ).rejects.toThrow('Insufficient data');
        });
    });

    describe('Prediction Generation', () => {
        it('should generate future predictions', async () => {
            const historicalData = [
                { bandwidth: 100, timestamp: new Date('2025-01-01') },
                { bandwidth: 110, timestamp: new Date('2025-01-02') }
            ];

            const predictions = await PredictiveAnalytics.generatePredictions(
                historicalData,
                24 // hours
            );

            expect(predictions).toHaveLength(24);
            expect(predictions[0]).toHaveProperty('predicted');
            expect(predictions[0]).toHaveProperty('confidence');
        });

        it('should include confidence intervals', async () => {
            const historicalData = [
                { bandwidth: 100, timestamp: new Date('2025-01-01') },
                { bandwidth: 110, timestamp: new Date('2025-01-02') }
            ];

            const predictions = await PredictiveAnalytics.generatePredictions(
                historicalData,
                1
            );

            expect(predictions[0].confidence).toBeGreaterThan(0);
            expect(predictions[0].confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('Model Management', () => {
        it('should train model with new data', async () => {
            const trainingData = [
                { bandwidth: 100, latency: 50, timestamp: new Date('2025-01-01') },
                { bandwidth: 110, latency: 55, timestamp: new Date('2025-01-02') }
            ];

            const result = await PredictiveAnalytics.trainModel(trainingData);
            expect(result).toHaveProperty('trained');
            expect(result.trained).toBe(true);
        });

        it('should validate model performance', async () => {
            const validationData = [
                { bandwidth: 100, latency: 50, timestamp: new Date('2025-01-01') },
                { bandwidth: 110, latency: 55, timestamp: new Date('2025-01-02') }
            ];

            const performance = await PredictiveAnalytics.validateModel(
                validationData
            );

            expect(performance).toHaveProperty('accuracy');
            expect(performance.accuracy).toBeGreaterThan(0);
        });
    });

    describe('Alert Generation', () => {
        it('should generate alerts for anomalies', async () => {
            const anomaly = {
                metric: 'bandwidth',
                value: 1000,
                threshold: 500,
                timestamp: new Date()
            };

            const alert = await PredictiveAnalytics.generateAlert(anomaly);
            expect(alert).toHaveProperty('type', 'anomaly');
            expect(alert).toHaveProperty('severity');
            expect(alert).toHaveProperty('message');
        });

        it('should prioritize alerts correctly', async () => {
            const criticalAnomaly = {
                metric: 'latency',
                value: 1000,
                threshold: 100,
                timestamp: new Date()
            };

            const alert = await PredictiveAnalytics.generateAlert(criticalAnomaly);
            expect(alert.severity).toBe('critical');
        });
    });

    describe('Performance', () => {
        it('should process large datasets efficiently', async () => {
            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                bandwidth: 100 + i,
                latency: 50 + i / 10,
                timestamp: new Date(Date.now() + i * 60000)
            }));

            const startTime = Date.now();
            await PredictiveAnalytics.processMetrics(largeDataset);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle concurrent requests', async () => {
            const requests = Array.from({ length: 10 }, () =>
                PredictiveAnalytics.processMetrics({
                    bandwidth: 100,
                    latency: 50,
                    timestamp: new Date()
                })
            );

            const results = await Promise.all(requests);
            results.forEach(result => {
                expect(result.processed).toBe(true);
            });
        });
    });
});
