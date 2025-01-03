import logger from '../utils/logger.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

class RealTimeAnalytics extends EventEmitter {
    constructor() {
        super();
        this.redis = new Redis(process.env.REDIS_URL);
        this.windowSize = 300; // 5 minutes in seconds
        this.updateInterval = 10; // 10 seconds
        this.patterns = new Map();
        this.thresholds = new Map();
        this.anomalyDetectors = new Map();

        this._initializeRealTimeMonitoring();
    }

    async analyzeTrafficPattern(deviceId, metrics) {
        try {
            // Get recent traffic data
            const recentData = await this._getRecentMetrics(deviceId);
            
            // Calculate current traffic pattern
            const pattern = this._calculateTrafficPattern(recentData);
            
            // Update pattern history
            await this._updatePatternHistory(deviceId, pattern);
            
            // Detect pattern changes
            const changes = this._detectPatternChanges(deviceId, pattern);
            
            if (changes.significant) {
                this.emit('patternChange', {
                    deviceId,
                    pattern,
                    changes
                });
            }

            return {
                deviceId,
                currentPattern: pattern,
                changes,
                prediction: this._predictNextPattern(deviceId)
            };
        } catch (error) {
            logger.error('Traffic pattern analysis error:', error);
            throw error;
        }
    }

    async predictLoadBalancing(metrics) {
        try {
            const predictions = new Map();
            
            // Analyze current load distribution
            const currentLoad = this._analyzeLoadDistribution(metrics);
            
            // Predict future load for each node
            for (const [nodeId, load] of currentLoad) {
                const prediction = await this._predictNodeLoad(nodeId, load);
                predictions.set(nodeId, prediction);
            }
            
            // Calculate optimal load distribution
            const distribution = this._calculateOptimalDistribution(predictions);
            
            // Generate load balancing actions
            const actions = this._generateLoadBalancingActions(distribution);
            
            return {
                timestamp: new Date(),
                currentLoad,
                predictions,
                recommendedActions: actions
            };
        } catch (error) {
            logger.error('Load balancing prediction error:', error);
            throw error;
        }
    }

    async adjustThresholds(deviceId, metrics) {
        try {
            const currentThresholds = await this._getCurrentThresholds(deviceId);
            
            // Calculate new thresholds based on recent patterns
            const newThresholds = this._calculateDynamicThresholds(metrics);
            
            // Validate threshold changes
            const validatedThresholds = this._validateThresholdChanges(
                currentThresholds,
                newThresholds
            );
            
            // Update thresholds
            await this._updateThresholds(deviceId, validatedThresholds);
            
            return {
                deviceId,
                previousThresholds: currentThresholds,
                newThresholds: validatedThresholds,
                adjustmentReason: this._getThresholdAdjustmentReason(metrics)
            };
        } catch (error) {
            logger.error('Threshold adjustment error:', error);
            throw error;
        }
    }

    async predictScaling(metrics) {
        try {
            // Analyze current resource utilization
            const utilization = this._analyzeResourceUtilization(metrics);
            
            // Predict future resource needs
            const prediction = await this._predictResourceNeeds(utilization);
            
            // Generate scaling triggers
            const triggers = this._generateScalingTriggers(prediction);
            
            // Validate scaling decisions
            const validatedTriggers = this._validateScalingTriggers(triggers);
            
            return {
                timestamp: new Date(),
                currentUtilization: utilization,
                prediction,
                scalingTriggers: validatedTriggers
            };
        } catch (error) {
            logger.error('Scaling prediction error:', error);
            throw error;
        }
    }

    async detectRealTimeAnomalies(metrics) {
        try {
            // Process current metrics
            const processed = this._preprocessMetrics(metrics);
            
            // Detect anomalies using multiple methods
            const anomalies = await Promise.all([
                this._detectStatisticalAnomalies(processed),
                this._detectPatternAnomalies(processed),
                this._detectContextualAnomalies(processed)
            ]);
            
            // Combine and deduplicate anomalies
            const combinedAnomalies = this._combineAnomalies(anomalies);
            
            // Calculate anomaly severity and impact
            const enrichedAnomalies = this._enrichAnomalies(combinedAnomalies);
            
            return {
                timestamp: new Date(),
                anomalies: enrichedAnomalies,
                summary: this._generateAnomalySummary(enrichedAnomalies)
            };
        } catch (error) {
            logger.error('Real-time anomaly detection error:', error);
            throw error;
        }
    }

    // Private helper methods
    async _getRecentMetrics(deviceId) {
        const key = `metrics:${deviceId}:recent`;
        const data = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
        return this._parseRedisData(data);
    }

    _calculateTrafficPattern(data) {
        return {
            volume: this._calculateMovingAverage(data.map(d => d.volume)),
            distribution: this._analyzeTrafficDistribution(data),
            trends: this._identifyShortTermTrends(data)
        };
    }

    _analyzeLoadDistribution(metrics) {
        const distribution = new Map();
        
        metrics.forEach(metric => {
            const nodeId = metric.nodeId;
            const load = this._calculateNodeLoad(metric);
            distribution.set(nodeId, load);
        });
        
        return distribution;
    }

    async _predictNodeLoad(nodeId, currentLoad) {
        const history = await this._getNodeLoadHistory(nodeId);
        const pattern = this._identifyLoadPattern(history);
        
        return {
            nodeId,
            currentLoad,
            predictedLoad: this._extrapolateLoad(currentLoad, pattern),
            confidence: this._calculatePredictionConfidence(pattern)
        };
    }

    _calculateDynamicThresholds(metrics) {
        const stats = this._calculateMetricStatistics(metrics);
        
        return {
            warning: stats.mean + stats.stdDev,
            critical: stats.mean + (2 * stats.stdDev),
            extreme: stats.mean + (3 * stats.stdDev)
        };
    }

    _analyzeResourceUtilization(metrics) {
        return {
            cpu: this._calculateResourceMetrics(metrics.cpu),
            memory: this._calculateResourceMetrics(metrics.memory),
            network: this._calculateResourceMetrics(metrics.network),
            storage: this._calculateResourceMetrics(metrics.storage)
        };
    }

    async _predictResourceNeeds(utilization) {
        const predictions = {};
        
        for (const [resource, metrics] of Object.entries(utilization)) {
            predictions[resource] = await this._generateResourcePrediction(
                resource,
                metrics
            );
        }
        
        return predictions;
    }

    _generateScalingTriggers(prediction) {
        const triggers = [];
        
        for (const [resource, pred] of Object.entries(prediction)) {
            if (pred.predictedValue > pred.threshold) {
                triggers.push({
                    resource,
                    type: 'scale_up',
                    urgency: this._calculateScalingUrgency(pred),
                    recommendation: this._generateScalingRecommendation(pred)
                });
            }
        }
        
        return triggers;
    }

    _initializeRealTimeMonitoring() {
        setInterval(() => {
            this._updateRealTimeMetrics().catch(error => {
                logger.error('Error updating real-time metrics:', error);
            });
        }, this.updateInterval * 1000);
    }

    async _updateRealTimeMetrics() {
        // Fetch latest metrics
        const metrics = await NetworkMetrics.find({
            'metrics.timestamp': {
                $gte: new Date(Date.now() - this.windowSize * 1000)
            }
        });

        // Process metrics for each device
        for (const metric of metrics) {
            await Promise.all([
                this.analyzeTrafficPattern(metric.deviceId, metric),
                this.detectRealTimeAnomalies(metric)
            ]);
        }
    }
}

export default new RealTimeAnalytics();
