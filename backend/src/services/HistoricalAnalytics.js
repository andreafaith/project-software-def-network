import logger from '../utils/logger.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import { TimeSeriesAnalysis, SeasonalDecomposition } from '../utils/TimeSeriesUtils.js';
import mongoose from 'mongoose';

class HistoricalAnalytics {
    constructor() {
        this.aggregationLevels = ['hourly', 'daily', 'weekly', 'monthly'];
        this.defaultTimeRange = {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
            end: new Date()
        };
    }

    async aggregateHistoricalData(options = {}) {
        try {
            const timeRange = options.timeRange || this.defaultTimeRange;
            const aggregationLevel = options.aggregationLevel || 'daily';
            
            // Validate time range and aggregation level
            this._validateAggregationParams(timeRange, aggregationLevel);
            
            // Perform aggregation
            const aggregation = await this._executeAggregation(timeRange, aggregationLevel);
            
            // Calculate summary statistics
            const statistics = this._calculateAggregationStatistics(aggregation);
            
            return {
                timeRange,
                aggregationLevel,
                data: aggregation,
                statistics,
                metadata: {
                    timestamp: new Date(),
                    recordCount: aggregation.length
                }
            };
        } catch (error) {
            logger.error('Historical data aggregation error:', error);
            throw error;
        }
    }

    async analyzeTrends(options = {}) {
        try {
            const timeRange = options.timeRange || this.defaultTimeRange;
            const metrics = options.metrics || ['bandwidth', 'latency', 'errors'];
            
            const trends = {};
            
            // Analyze each metric
            for (const metric of metrics) {
                const data = await this._fetchMetricData(metric, timeRange);
                trends[metric] = {
                    longTerm: this._analyzeLongTermTrend(data),
                    shortTerm: this._analyzeShortTermTrend(data),
                    cyclical: this._analyzeCyclicalPatterns(data),
                    breakpoints: this._detectTrendBreakpoints(data)
                };
            }
            
            return {
                timeRange,
                trends,
                summary: this._generateTrendSummary(trends),
                recommendations: this._generateTrendRecommendations(trends)
            };
        } catch (error) {
            logger.error('Trend analysis error:', error);
            throw error;
        }
    }

    async recognizePatterns(options = {}) {
        try {
            const timeRange = options.timeRange || this.defaultTimeRange;
            const data = await this._fetchHistoricalData(timeRange);
            
            // Identify patterns at different time scales
            const patterns = {
                daily: this._identifyDailyPatterns(data),
                weekly: this._identifyWeeklyPatterns(data),
                monthly: this._identifyMonthlyPatterns(data),
                custom: this._identifyCustomPatterns(data, options.customPeriod)
            };
            
            // Analyze pattern stability and confidence
            const analysis = this._analyzePatternStability(patterns);
            
            return {
                timeRange,
                patterns,
                analysis,
                recommendations: this._generatePatternRecommendations(patterns)
            };
        } catch (error) {
            logger.error('Pattern recognition error:', error);
            throw error;
        }
    }

    async predictCapacity(options = {}) {
        try {
            const horizon = options.horizon || 90; // 90 days forecast
            const resources = options.resources || ['bandwidth', 'storage', 'processing'];
            
            const predictions = {};
            
            // Generate predictions for each resource
            for (const resource of resources) {
                const historical = await this._fetchResourceHistory(resource);
                predictions[resource] = {
                    forecast: this._generateCapacityForecast(historical, horizon),
                    constraints: this._analyzeResourceConstraints(resource),
                    recommendations: this._generateCapacityRecommendations(resource)
                };
            }
            
            return {
                horizon,
                predictions,
                summary: this._generateCapacitySummary(predictions),
                actions: this._generateCapacityActions(predictions)
            };
        } catch (error) {
            logger.error('Capacity prediction error:', error);
            throw error;
        }
    }

    async analyzeSeasonality(options = {}) {
        try {
            const timeRange = options.timeRange || this.defaultTimeRange;
            const metrics = options.metrics || ['traffic', 'usage', 'performance'];
            
            const seasonality = {};
            
            // Analyze seasonality for each metric
            for (const metric of metrics) {
                const data = await this._fetchMetricData(metric, timeRange);
                
                // Perform seasonal decomposition
                const decomposition = new SeasonalDecomposition(data, 24); // 24-hour seasonality
                const components = decomposition.decompose();
                
                seasonality[metric] = {
                    components,
                    patterns: this._analyzeSeasonalPatterns(components),
                    strength: this._calculateSeasonalStrength(components),
                    forecast: this._generateSeasonalForecast(components)
                };
            }
            
            return {
                timeRange,
                seasonality,
                summary: this._generateSeasonalitySummary(seasonality),
                insights: this._generateSeasonalInsights(seasonality)
            };
        } catch (error) {
            logger.error('Seasonality analysis error:', error);
            throw error;
        }
    }

    // Private helper methods
    async _executeAggregation(timeRange, level) {
        const aggregationPipeline = [
            {
                $match: {
                    timestamp: {
                        $gte: timeRange.start,
                        $lte: timeRange.end
                    }
                }
            },
            {
                $group: {
                    _id: this._getGroupingExpression(level),
                    avgBandwidth: { $avg: '$metrics.bandwidth.total.value' },
                    maxBandwidth: { $max: '$metrics.bandwidth.total.value' },
                    avgLatency: { $avg: '$metrics.latency.value' },
                    errorCount: { $sum: '$metrics.errors.count' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ];

        return NetworkMetrics.aggregate(aggregationPipeline);
    }

    _getGroupingExpression(level) {
        switch (level) {
            case 'hourly':
                return {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' },
                    hour: { $hour: '$timestamp' }
                };
            case 'daily':
                return {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' }
                };
            case 'weekly':
                return {
                    year: { $year: '$timestamp' },
                    week: { $week: '$timestamp' }
                };
            case 'monthly':
                return {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' }
                };
            default:
                throw new Error('Invalid aggregation level');
        }
    }

    _analyzeLongTermTrend(data) {
        const values = data.map(d => d.value);
        const timestamps = data.map(d => d.timestamp);
        
        // Calculate linear regression
        const regression = this._calculateLinearRegression(timestamps, values);
        
        // Analyze trend stability
        const stability = this._analyzeTrendStability(values, regression);
        
        return {
            slope: regression.slope,
            intercept: regression.intercept,
            r2: regression.r2,
            stability,
            direction: regression.slope > 0 ? 'increasing' : 'decreasing',
            strength: Math.abs(regression.slope)
        };
    }

    _analyzeSeasonalPatterns(components) {
        const { seasonal } = components;
        const patterns = [];
        
        // Detect daily patterns
        patterns.push({
            type: 'daily',
            peaks: this._findPeakPeriods(seasonal, 24),
            troughs: this._findTroughPeriods(seasonal, 24)
        });
        
        // Detect weekly patterns
        patterns.push({
            type: 'weekly',
            peaks: this._findPeakPeriods(seasonal, 168),
            troughs: this._findTroughPeriods(seasonal, 168)
        });
        
        return patterns;
    }

    _generateCapacityForecast(historical, horizon) {
        // Calculate growth rate
        const growthRate = this._calculateGrowthRate(historical);
        
        // Generate baseline forecast
        const baseline = this._generateBaselineForecast(historical, horizon);
        
        // Add seasonal adjustments
        const seasonal = this._addSeasonalAdjustments(baseline, historical);
        
        // Add confidence intervals
        return this._addConfidenceIntervals(seasonal, growthRate);
    }

    _validateAggregationParams(timeRange, level) {
        if (!timeRange.start || !timeRange.end) {
            throw new Error('Invalid time range');
        }
        
        if (!this.aggregationLevels.includes(level)) {
            throw new Error('Invalid aggregation level');
        }
        
        if (timeRange.start >= timeRange.end) {
            throw new Error('Start time must be before end time');
        }
    }
}

export default new HistoricalAnalytics();
