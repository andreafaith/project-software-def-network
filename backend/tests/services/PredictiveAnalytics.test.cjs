const PredictiveAnalytics = require('../../src/services/PredictiveAnalytics');
const NetworkMetrics = require('../../src/models/NetworkMetrics');

describe('PredictiveAnalytics Service', () => {
    let predictiveAnalytics;
    let mockMetrics;

    beforeEach(() => {
        predictiveAnalytics = new PredictiveAnalytics();
        mockMetrics = [
            {
                deviceId: 'test-device',
                timestamp: new Date('2023-01-01'),
                metrics: {
                    bandwidth: {
                        total: { value: 100, unit: 'Mbps' }
                    },
                    latency: { value: 20, unit: 'ms' }
                }
            },
            {
                deviceId: 'test-device',
                timestamp: new Date('2023-01-02'),
                metrics: {
                    bandwidth: {
                        total: { value: 150, unit: 'Mbps' }
                    },
                    latency: { value: 25, unit: 'ms' }
                }
            },
            {
                deviceId: 'test-device',
                timestamp: new Date('2023-01-03'),
                metrics: {
                    bandwidth: {
                        total: { value: 200, unit: 'Mbps' }
                    },
                    latency: { value: 30, unit: 'ms' }
                }
            }
        ];
    });

    describe('analyzeTrend', () => {
        it('should detect increasing trend', async () => {
            const result = await predictiveAnalytics.analyzeTrend(mockMetrics, 'bandwidth');
            expect(result).toEqual({
                direction: 'increasing',
                confidence: expect.any(Number),
                metric: 'bandwidth'
            });
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it('should detect decreasing trend', async () => {
            mockMetrics.reverse();
            const result = await predictiveAnalytics.analyzeTrend(mockMetrics, 'bandwidth');
            expect(result).toEqual({
                direction: 'decreasing',
                confidence: expect.any(Number),
                metric: 'bandwidth'
            });
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('detectAnomalies', () => {
        it('should detect bandwidth anomalies', async () => {
            mockMetrics.push({
                deviceId: 'test-device',
                timestamp: new Date('2023-01-04'),
                metrics: {
                    bandwidth: {
                        total: { value: 500, unit: 'Mbps' }
                    },
                    latency: { value: 35, unit: 'ms' }
                }
            });

            const result = await predictiveAnalytics.detectAnomalies(mockMetrics);
            expect(result).toContainEqual({
                type: 'bandwidth',
                value: 500,
                timestamp: expect.any(Date),
                severity: expect.any(String),
                confidence: expect.any(Number)
            });
        });

        it('should detect latency anomalies', async () => {
            mockMetrics.push({
                deviceId: 'test-device',
                timestamp: new Date('2023-01-04'),
                metrics: {
                    bandwidth: {
                        total: { value: 250, unit: 'Mbps' }
                    },
                    latency: { value: 100, unit: 'ms' }
                }
            });

            const result = await predictiveAnalytics.detectAnomalies(mockMetrics);
            expect(result).toContainEqual({
                type: 'latency',
                value: 100,
                timestamp: expect.any(Date),
                severity: expect.any(String),
                confidence: expect.any(Number)
            });
        });
    });

    describe('generateForecast', () => {
        it('should generate forecast with confidence intervals', async () => {
            const result = await predictiveAnalytics.generateForecast(mockMetrics, 'bandwidth', 3);
            expect(result).toEqual({
                forecast: expect.arrayContaining([
                    expect.objectContaining({
                        timestamp: expect.any(Date),
                        value: expect.any(Number),
                        confidence: {
                            upper: expect.any(Number),
                            lower: expect.any(Number)
                        }
                    })
                ]),
                metric: 'bandwidth',
                confidence: expect.any(Number)
            });
            expect(result.forecast).toHaveLength(3);
        });

        it('should maintain trend direction in forecast', async () => {
            const result = await predictiveAnalytics.generateForecast(mockMetrics, 'bandwidth', 3);
            const lastActualValue = mockMetrics[mockMetrics.length - 1].metrics.bandwidth.total.value;
            const forecastValues = result.forecast.map(f => f.value);
            
            // Check if forecast maintains the increasing trend
            expect(forecastValues[0]).toBeGreaterThan(lastActualValue);
            for (let i = 1; i < forecastValues.length; i++) {
                expect(forecastValues[i]).toBeGreaterThan(forecastValues[i-1]);
            }
        });
    });

    describe('processMetrics', () => {
        it('should validate required fields', async () => {
            const invalidMetrics = {
                deviceId: 'test-device',
                metrics: {
                    // Missing bandwidth and latency
                }
            };

            await expect(predictiveAnalytics.processMetrics(invalidMetrics))
                .rejects.toThrow('Missing required metrics');
        });

        it('should process valid metrics', async () => {
            const validMetrics = mockMetrics[0];
            const result = await predictiveAnalytics.processMetrics(validMetrics);
            expect(result).toBeTruthy();
        });
    });
});
