import logger from '../utils/logger.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import { MovingAverage, ExponentialSmoothing } from '../utils/TimeSeriesUtils.js';

class PredictiveAnalytics {
    constructor() {
        this.models = new Map();
        this.anomalyThreshold = 2.5; // Standard deviations for anomaly detection
        this.forecastHorizon = 24 * 7; // 7 days ahead in hours
        this.minDataPoints = 168; // Minimum data points needed (1 week hourly data)
    }

    async analyzeTimeSeries(deviceId, metricType, options = {}) {
        try {
            const timeRange = options.timeRange || {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
                end: new Date()
            };

            // Fetch historical data
            const data = await this._fetchMetricData(deviceId, metricType, timeRange);
            
            // Perform time series analysis
            const analysis = {
                trend: await this._analyzeTrend(data),
                seasonality: await this._analyzeSeasonality(data),
                statistics: this._calculateStatistics(data),
                forecast: await this._generateForecast(data, options.horizon)
            };

            return {
                deviceId,
                metricType,
                timeRange,
                analysis
            };

        } catch (error) {
            logger.error('Time series analysis error:', error);
            throw error;
        }
    }

    async predictBandwidthUsage(deviceId, options = {}) {
        try {
            const horizon = options.horizon || 24; // Default 24 hours ahead
            
            // Get historical bandwidth data
            const data = await this._fetchMetricData(deviceId, 'bandwidth.total', {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                end: new Date()
            });

            // Create prediction model if not exists
            if (!this.models.has(deviceId)) {
                await this._initializePredictionModel(deviceId, data);
            }

            // Generate predictions
            const predictions = await this._generateBandwidthPredictions(deviceId, horizon);
            
            return {
                deviceId,
                predictions,
                confidence: this._calculateConfidenceInterval(predictions),
                metadata: {
                    modelType: 'exponential_smoothing',
                    lastUpdate: new Date(),
                    accuracy: this.models.get(deviceId).accuracy
                }
            };

        } catch (error) {
            logger.error('Bandwidth prediction error:', error);
            throw error;
        }
    }

    async detectAnomalies(deviceId, options = {}) {
        try {
            const metrics = options.metrics || ['bandwidth', 'latency', 'packetLoss'];
            const results = {};

            for (const metric of metrics) {
                const data = await this._fetchMetricData(deviceId, metric, options.timeRange);
                
                // Detect anomalies using statistical methods
                const anomalies = this._detectStatisticalAnomalies(data, {
                    threshold: options.threshold || this.anomalyThreshold,
                    method: options.method || 'zscore'
                });

                // Analyze patterns in anomalies
                const patterns = this._analyzeAnomalyPatterns(anomalies);

                results[metric] = {
                    anomalies,
                    patterns,
                    statistics: this._calculateAnomalyStatistics(anomalies)
                };
            }

            return {
                deviceId,
                timestamp: new Date(),
                results
            };

        } catch (error) {
            logger.error('Anomaly detection error:', error);
            throw error;
        }
    }

    async analyzeNetworkPatterns(deviceId, options = {}) {
        try {
            const patterns = {};
            const metrics = await this._fetchAllMetrics(deviceId, options.timeRange);

            // Analyze daily patterns
            patterns.daily = this._analyzeDailyPatterns(metrics);

            // Analyze weekly patterns
            patterns.weekly = this._analyzeWeeklyPatterns(metrics);

            // Analyze correlation between metrics
            patterns.correlations = this._analyzeMetricCorrelations(metrics);

            // Identify peak usage periods
            patterns.peaks = this._identifyPeakPeriods(metrics);

            return {
                deviceId,
                timestamp: new Date(),
                patterns,
                confidence: this._calculatePatternConfidence(patterns)
            };

        } catch (error) {
            logger.error('Pattern analysis error:', error);
            throw error;
        }
    }

    async forecastResourceUtilization(deviceId, options = {}) {
        try {
            const resources = options.resources || ['cpu', 'memory', 'bandwidth'];
            const horizon = options.horizon || this.forecastHorizon;
            const forecasts = {};

            for (const resource of resources) {
                const data = await this._fetchMetricData(deviceId, resource, options.timeRange);
                
                // Generate resource-specific forecasts
                forecasts[resource] = await this._generateResourceForecast(data, {
                    horizon,
                    confidence: options.confidence || 0.95
                });
            }

            // Calculate combined utilization forecast
            const combinedForecast = this._combineForecastsWithConstraints(forecasts);

            return {
                deviceId,
                timestamp: new Date(),
                forecasts,
                combinedForecast,
                recommendations: this._generateResourceRecommendations(combinedForecast)
            };

        } catch (error) {
            logger.error('Resource forecasting error:', error);
            throw error;
        }
    }

    // Private helper methods
    async _fetchMetricData(deviceId, metricType, timeRange) {
        return NetworkMetrics.find({
            deviceId,
            [`metrics.${metricType}`]: { $exists: true },
            'metrics.timestamp': {
                $gte: timeRange.start,
                $lte: timeRange.end
            }
        }).sort({ 'metrics.timestamp': 1 });
    }

    async _initializePredictionModel(deviceId, data) {
        // Initialize exponential smoothing model
        const model = new ExponentialSmoothing(data, {
            seasonalPeriods: 24, // Daily seasonality
            alpha: 0.2,
            beta: 0.1,
            gamma: 0.3
        });

        // Train model
        await model.train();
        
        this.models.set(deviceId, model);
    }

    _detectStatisticalAnomalies(data, options) {
        const { values, mean, stdDev } = this._calculateStatistics(data);
        const anomalies = [];

        values.forEach((value, index) => {
            const zscore = Math.abs((value - mean) / stdDev);
            if (zscore > options.threshold) {
                anomalies.push({
                    timestamp: data[index].timestamp,
                    value,
                    zscore,
                    deviation: value - mean
                });
            }
        });

        return anomalies;
    }

    _calculateStatistics(data) {
        const values = data.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return { values, mean, stdDev, variance };
    }

    _analyzeAnomalyPatterns(anomalies) {
        // Group anomalies by time patterns
        const patterns = {
            hourly: new Map(),
            daily: new Map(),
            weekly: new Map()
        };

        anomalies.forEach(anomaly => {
            const date = new Date(anomaly.timestamp);
            patterns.hourly.set(date.getHours(), (patterns.hourly.get(date.getHours()) || 0) + 1);
            patterns.daily.set(date.getDay(), (patterns.daily.get(date.getDay()) || 0) + 1);
            patterns.weekly.set(Math.floor(date.getDate() / 7), (patterns.weekly.get(Math.floor(date.getDate() / 7)) || 0) + 1);
        });

        return patterns;
    }

    async _generateResourceForecast(data, options) {
        const model = new ExponentialSmoothing(data, {
            seasonalPeriods: 24,
            confidence: options.confidence
        });

        await model.train();
        return model.forecast(options.horizon);
    }

    _combineForecastsWithConstraints(forecasts) {
        // Implement resource constraints and dependencies
        const combined = {};
        const constraints = {
            maxCpu: 100,
            maxMemory: 100,
            maxBandwidth: this._calculateMaxBandwidth(forecasts.bandwidth)
        };

        // Adjust forecasts based on constraints
        Object.keys(forecasts).forEach(resource => {
            combined[resource] = forecasts[resource].map(f => ({
                ...f,
                value: Math.min(f.value, constraints[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}`])
            }));
        });

        return combined;
    }

    _generateResourceRecommendations(forecast) {
        const recommendations = [];

        // Analyze resource utilization trends
        Object.entries(forecast).forEach(([resource, predictions]) => {
            const maxUtilization = Math.max(...predictions.map(p => p.value));
            const avgUtilization = predictions.reduce((sum, p) => sum + p.value, 0) / predictions.length;

            if (maxUtilization > 80) {
                recommendations.push({
                    resource,
                    type: 'scaling',
                    priority: 'high',
                    message: `Consider scaling ${resource} capacity. Predicted max utilization: ${maxUtilization}%`
                });
            }

            if (avgUtilization < 20) {
                recommendations.push({
                    resource,
                    type: 'optimization',
                    priority: 'medium',
                    message: `Consider optimizing ${resource} allocation. Average utilization: ${avgUtilization}%`
                });
            }
        });

        return recommendations;
    }
}

export default new PredictiveAnalytics();
