import logger from './logger.js';

export class AlertThresholdCalculator {
    constructor(options = {}) {
        this.confidenceLevel = options.confidenceLevel || 0.95;
        this.minDataPoints = options.minDataPoints || 30;
        this.seasonalityPeriods = options.seasonalityPeriods || [24, 168]; // hours in day, week
    }

    calculateAdaptiveThresholds(data, context = {}) {
        try {
            // Validate input data
            if (!this._validateInputData(data)) {
                throw new Error('Invalid input data for threshold calculation');
            }

            // Calculate statistical thresholds
            const baseThresholds = this._calculateStatisticalThresholds(data);
            
            // Adjust for seasonality
            const seasonalThresholds = this._adjustForSeasonality(
                baseThresholds,
                data,
                context
            );
            
            // Add dynamic components
            const dynamicThresholds = this._addDynamicComponents(
                seasonalThresholds,
                context
            );
            
            return {
                thresholds: dynamicThresholds,
                metadata: this._generateThresholdMetadata(dynamicThresholds, data)
            };
        } catch (error) {
            logger.error('Error calculating adaptive thresholds:', error);
            throw error;
        }
    }

    _validateInputData(data) {
        return (
            Array.isArray(data) &&
            data.length >= this.minDataPoints &&
            data.every(point => 
                typeof point.value === 'number' &&
                point.timestamp instanceof Date
            )
        );
    }

    _calculateStatisticalThresholds(data) {
        const values = data.map(point => point.value);
        const stats = this._calculateStatistics(values);
        
        return {
            warning: stats.mean + stats.stdDev,
            critical: stats.mean + (2 * stats.stdDev),
            emergency: stats.mean + (3 * stats.stdDev)
        };
    }

    _adjustForSeasonality(thresholds, data, context) {
        const seasonalFactors = this._calculateSeasonalFactors(data);
        const adjustedThresholds = {};
        
        for (const [level, value] of Object.entries(thresholds)) {
            const seasonalAdjustment = this._calculateSeasonalAdjustment(
                seasonalFactors,
                context
            );
            adjustedThresholds[level] = value * (1 + seasonalAdjustment);
        }
        
        return adjustedThresholds;
    }

    _addDynamicComponents(thresholds, context) {
        const dynamicFactors = this._calculateDynamicFactors(context);
        const adjustedThresholds = {};
        
        for (const [level, value] of Object.entries(thresholds)) {
            adjustedThresholds[level] = value * (1 + dynamicFactors[level]);
        }
        
        return adjustedThresholds;
    }
}

export class AlertGrouper {
    constructor(options = {}) {
        this.timeWindow = options.timeWindow || 900000; // 15 minutes
        this.similarityThreshold = options.similarityThreshold || 0.8;
        this.maxGroupSize = options.maxGroupSize || 100;
    }

    groupAlerts(alerts) {
        try {
            const groups = new Map();
            const sortedAlerts = this._sortAlertsByTimestamp(alerts);
            
            for (const alert of sortedAlerts) {
                const matchingGroup = this._findMatchingGroup(groups, alert);
                
                if (matchingGroup) {
                    this._addAlertToGroup(matchingGroup, alert);
                } else {
                    this._createNewGroup(groups, alert);
                }
            }
            
            return this._finalizeGroups(groups);
        } catch (error) {
            logger.error('Error grouping alerts:', error);
            throw error;
        }
    }

    _sortAlertsByTimestamp(alerts) {
        return [...alerts].sort((a, b) => a.timestamp - b.timestamp);
    }

    _findMatchingGroup(groups, alert) {
        for (const group of groups.values()) {
            if (this._alertMatchesGroup(group, alert)) {
                return group;
            }
        }
        return null;
    }

    _alertMatchesGroup(group, alert) {
        return (
            this._isWithinTimeWindow(group, alert) &&
            this._hasSimilarAttributes(group, alert) &&
            group.alerts.length < this.maxGroupSize
        );
    }
}

export class RootCausePredictor {
    constructor(options = {}) {
        this.maxCauses = options.maxCauses || 5;
        this.minConfidence = options.minConfidence || 0.6;
        this.contextWindow = options.contextWindow || 3600000; // 1 hour
    }

    async predictRootCause(alert, context) {
        try {
            // Gather relevant metrics
            const metrics = await this._gatherContextMetrics(alert, context);
            
            // Analyze relationships
            const relationships = this._analyzeMetricRelationships(metrics);
            
            // Identify potential causes
            const causes = this._identifyPotentialCauses(relationships);
            
            // Rank and filter causes
            const rankedCauses = this._rankCauses(causes);
            
            return this._generateRootCauseReport(rankedCauses);
        } catch (error) {
            logger.error('Error predicting root cause:', error);
            throw error;
        }
    }
}

export class ImpactPredictor {
    constructor(options = {}) {
        this.propagationLevels = options.propagationLevels || 3;
        this.impactThreshold = options.impactThreshold || 0.5;
        this.predictionHorizon = options.predictionHorizon || 3600000; // 1 hour
    }

    async predictImpact(alert, context) {
        try {
            // Analyze direct impact
            const directImpact = await this._analyzeDirectImpact(alert);
            
            // Predict propagation
            const propagation = await this._predictPropagation(alert, context);
            
            // Calculate business impact
            const businessImpact = this._calculateBusinessImpact(
                directImpact,
                propagation
            );
            
            return this._generateImpactReport(directImpact, propagation, businessImpact);
        } catch (error) {
            logger.error('Error predicting impact:', error);
            throw error;
        }
    }
}

export class PriorityPredictor {
    constructor(options = {}) {
        this.priorityLevels = options.priorityLevels || ['low', 'medium', 'high', 'critical'];
        this.businessFactors = options.businessFactors || ['revenue', 'users', 'sla'];
        this.weightingScheme = options.weightingScheme || this._defaultWeightingScheme();
    }

    async predictPriority(alert, context) {
        try {
            // Calculate technical priority
            const technicalPriority = this._calculateTechnicalPriority(alert);
            
            // Calculate business priority
            const businessPriority = await this._calculateBusinessPriority(alert, context);
            
            // Combine priorities
            const finalPriority = this._combinePriorities(
                technicalPriority,
                businessPriority
            );
            
            return this._generatePriorityReport(finalPriority);
        } catch (error) {
            logger.error('Error predicting priority:', error);
            throw error;
        }
    }

    _defaultWeightingScheme() {
        return {
            technical: 0.4,
            business: 0.6,
            factors: {
                revenue: 0.4,
                users: 0.3,
                sla: 0.3
            }
        };
    }
}
