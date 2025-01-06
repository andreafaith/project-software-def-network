import NetworkMetrics from '../models/NetworkMetrics.js';

class PredictiveAnalytics {
    constructor() {
        this.minDataPoints = 5;
        this.anomalyThreshold = 2.5; // Standard deviations
        this.forecastHorizon = 5; // Number of future points to predict
    }

    async analyzeTrend(data, metric = 'value') {
        if (!Array.isArray(data) || data.length < this.minDataPoints) {
            return {
                direction: 'unknown',
                confidence: 0
            };
        }

        const values = data.map(point => point[metric]);
        const n = values.length;
        
        // Calculate slope using linear regression
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const confidence = Math.abs(slope) / (Math.max(...values) - Math.min(...values));

        let direction;
        if (Math.abs(slope) < 0.1) {
            direction = 'stable';
        } else {
            direction = slope > 0 ? 'up' : 'down';
        }

        return {
            direction,
            confidence: Math.min(confidence, 1)
        };
    }

    async detectAnomalies(data, metric = 'value') {
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }

        const values = data.map(point => point[metric]);
        const mean = values.reduce((a, b) => a + b) / values.length;
        const stdDev = Math.sqrt(
            values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
        );

        const anomalies = [];
        values.forEach((value, index) => {
            const zScore = Math.abs(value - mean) / stdDev;
            if (zScore > this.anomalyThreshold) {
                anomalies.push({
                    index,
                    value,
                    severity: zScore > this.anomalyThreshold * 1.5 ? 'critical' : 'warning',
                    timestamp: data[index].timestamp,
                    confidence: Math.min(zScore / (this.anomalyThreshold * 2), 1)
                });
            }
        });

        return anomalies;
    }

    async generateForecast(data, metric = 'value', horizon = this.forecastHorizon) {
        if (!Array.isArray(data) || data.length < this.minDataPoints) {
            return [];
        }

        const values = data.map(point => point[metric]);
        const lastTimestamp = new Date(data[data.length - 1].timestamp);

        // Simple exponential smoothing
        const alpha = 0.3;
        let level = values[0];
        const smoothed = values.map(val => {
            level = alpha * val + (1 - alpha) * level;
            return level;
        });

        // Calculate trend
        const trend = (smoothed[smoothed.length - 1] - smoothed[0]) / smoothed.length;

        // Generate forecast
        const forecast = [];
        for (let i = 1; i <= horizon; i++) {
            const predictedValue = level + trend * i;
            const timestamp = new Date(lastTimestamp);
            timestamp.setHours(timestamp.getHours() + i);

            forecast.push({
                timestamp,
                value: predictedValue,
                confidence: {
                    lower: predictedValue * 0.9,
                    upper: predictedValue * 1.1
                }
            });
        }

        return {
            forecast,
            metric,
            confidence: Math.min(1 / Math.log(data.length), 1)
        };
    }

    async processMetrics(metrics) {
        if (!metrics || !metrics.deviceId || !metrics.metrics) {
            throw new Error('Invalid metrics data');
        }

        const result = {
            deviceId: metrics.deviceId,
            timestamp: new Date(),
            trends: {},
            predictions: [],
            anomalies: []
        };

        // Process each metric type
        const metricTypes = ['bandwidth', 'latency', 'packetLoss', 'jitter'];
        for (const metric of metricTypes) {
            if (metrics.metrics[metric]) {
                // Analyze trends
                const trend = await this.analyzeTrend([metrics], metric);
                result.trends[metric] = trend;

                // Detect anomalies
                const anomalies = await this.detectAnomalies([metrics], metric);
                result.anomalies.push(...anomalies);

                // Generate predictions
                const forecast = await this.generateForecast([metrics], metric);
                result.predictions.push({
                    metric,
                    forecast: forecast.forecast || [],
                    confidence: forecast.confidence || 0
                });
            }
        }

        return result;
    }

    async analyzeMetrics(deviceId) {
        if (!deviceId) {
            throw new Error('Invalid device ID');
        }

        const metrics = await NetworkMetrics.find({ deviceId }).sort({ timestamp: -1 }).limit(100);
        if (!metrics || metrics.length === 0) {
            return { prediction: 'No data available for analysis' };
        }

        const result = await this.processMetrics({
            deviceId,
            metrics: metrics[0].metrics
        });

        return result;
    }
}

export default PredictiveAnalytics;