import PredictiveAnalytics from '../../services/PredictiveAnalytics.js';
import DiscordReporter from '../../services/DiscordReporter.js';

describe('PredictiveAnalytics Service', () => {
    beforeEach(() => {
        // Reset any mocks or test data
    });

    test('should process metrics data successfully', async () => {
        const testMetrics = {
            deviceId: 'test-device-1',
            metrics: {
                cpu: 50,
                memory: 70,
                network: 30
            },
            timestamp: new Date()
        };

        const result = await PredictiveAnalytics.processMetrics(testMetrics);
        expect(result).toBeDefined();
        expect(result.processed).toBe(true);
    });

    test('should detect anomalies in metrics', async () => {
        const anomalousMetrics = {
            deviceId: 'test-device-1',
            metrics: {
                cpu: 95, // High CPU usage
                memory: 90, // High memory usage
                network: 20
            },
            timestamp: new Date()
        };

        const result = await PredictiveAnalytics.detectAnomalies(anomalousMetrics);
        expect(result.anomalies).toContain('cpu');
        expect(result.anomalies).toContain('memory');
    });

    test('should generate accurate predictions', async () => {
        const historicalData = [
            {
                metrics: { cpu: 50, memory: 60 },
                timestamp: new Date('2025-01-01T00:00:00')
            },
            {
                metrics: { cpu: 55, memory: 65 },
                timestamp: new Date('2025-01-01T01:00:00')
            },
            {
                metrics: { cpu: 60, memory: 70 },
                timestamp: new Date('2025-01-01T02:00:00')
            }
        ];

        const predictions = await PredictiveAnalytics.generatePredictions(historicalData);
        expect(predictions).toBeDefined();
        expect(predictions.length).toBeGreaterThan(0);
        expect(predictions[0]).toHaveProperty('predicted');
        expect(predictions[0]).toHaveProperty('confidence');
    });

    test('should handle invalid input data', async () => {
        const invalidMetrics = {
            deviceId: 'test-device-1',
            metrics: {
                cpu: 'invalid',
                memory: -50,
                network: null
            }
        };

        await expect(
            PredictiveAnalytics.processMetrics(invalidMetrics)
        ).rejects.toThrow();
    });

    test('should calculate trend analysis correctly', async () => {
        const trendData = [
            {
                metrics: { cpu: 50, memory: 60 },
                timestamp: new Date('2025-01-01T00:00:00')
            },
            {
                metrics: { cpu: 55, memory: 65 },
                timestamp: new Date('2025-01-01T01:00:00')
            },
            {
                metrics: { cpu: 60, memory: 70 },
                timestamp: new Date('2025-01-01T02:00:00')
            }
        ];

        const trends = await PredictiveAnalytics.analyzeTrends(trendData);
        expect(trends).toBeDefined();
        expect(trends.cpu.trend).toBeGreaterThan(0);
        expect(trends.memory.trend).toBeGreaterThan(0);
    });
});
