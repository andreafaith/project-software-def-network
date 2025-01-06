import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NetworkMetrics } from '../../models/NetworkMetrics.js';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

beforeEach(async () => {
    await NetworkMetrics.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('NetworkMetrics Model', () => {
    test('should save a valid network metric', async () => {
        const validMetric = {
            deviceId: 'test-device-1',
            timestamp: new Date(),
            metrics: {
                bandwidth: 100,
                latency: 50,
                packetLoss: 0.1,
                jitter: 5
            }
        };

        const savedMetric = await NetworkMetrics.create(validMetric);
        expect(savedMetric._id).toBeDefined();
        expect(savedMetric.deviceId).toBe(validMetric.deviceId);
        expect(savedMetric.metrics.bandwidth).toBe(validMetric.metrics.bandwidth);
    });

    test('should require deviceId', async () => {
        const metricWithoutDeviceId = {
            timestamp: new Date(),
            metrics: {
                bandwidth: 100,
                latency: 50,
                packetLoss: 0.1,
                jitter: 5
            }
        };

        await expect(NetworkMetrics.create(metricWithoutDeviceId))
            .rejects
            .toThrow();
    });

    test('should require metrics object', async () => {
        const metricWithoutMetrics = {
            deviceId: 'test-device-1',
            timestamp: new Date()
        };

        await expect(NetworkMetrics.create(metricWithoutMetrics))
            .rejects
            .toThrow();
    });

    test('should validate metric values', async () => {
        const metricWithInvalidValues = {
            deviceId: 'test-device-1',
            timestamp: new Date(),
            metrics: {
                bandwidth: -100, // invalid negative value
                latency: 50,
                packetLoss: 0.1,
                jitter: 5
            }
        };

        await expect(NetworkMetrics.create(metricWithInvalidValues))
            .rejects
            .toThrow();
    });

    test('should calculate quality score', async () => {
        const metric = new NetworkMetrics({
            deviceId: 'test-device-1',
            metrics: {
                bandwidth: 500, // 50% of max
                latency: 100,  // 90% good
                packetLoss: 1, // 99% good
                jitter: 10    // 90% good
            }
        });

        const score = metric.calculateQualityScore();
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(100);
    });

    test('should get average metrics', async () => {
        const metrics = [
            {
                deviceId: 'test-device-1',
                metrics: {
                    bandwidth: 100,
                    latency: 50,
                    packetLoss: 0.1,
                    jitter: 5
                }
            },
            {
                deviceId: 'test-device-1',
                metrics: {
                    bandwidth: 200,
                    latency: 40,
                    packetLoss: 0.2,
                    jitter: 4
                }
            }
        ];

        await NetworkMetrics.create(metrics);

        const averages = await NetworkMetrics.getAverageMetrics('test-device-1', 3600000);
        expect(averages).toBeDefined();
        expect(averages.avgBandwidth).toBe(150);
        expect(averages.avgLatency).toBe(45);
    });

    test('should get metrics history', async () => {
        const metrics = [
            {
                deviceId: 'test-device-1',
                metrics: {
                    bandwidth: 100,
                    latency: 50,
                    packetLoss: 0.1,
                    jitter: 5
                }
            },
            {
                deviceId: 'test-device-1',
                metrics: {
                    bandwidth: 200,
                    latency: 40,
                    packetLoss: 0.2,
                    jitter: 4
                }
            }
        ];

        await NetworkMetrics.create(metrics);

        const history = await NetworkMetrics.getMetricsHistory('test-device-1', 'bandwidth', 2);
        expect(history).toHaveLength(2);
        expect(history[0].metrics.bandwidth).toBeDefined();
    });
});
