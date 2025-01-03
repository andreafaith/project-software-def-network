import logger from '../utils/logger.js';
import AlertConfig from '../models/AlertConfig.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import { TimeSeriesAnalysis } from '../utils/TimeSeriesUtils.js';
import RealTimeAnalytics from './RealTimeAnalytics.js';
import HistoricalAnalytics from './HistoricalAnalytics.js';

class PredictiveAlerts {
    constructor() {
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
        this.thresholdConfidence = 0.95;
        this.groupingTimeWindow = 15 * 60 * 1000; // 15 minutes
        this._initializeAlertSystem();
    }

    async predictThresholds(metric, options = {}) {
        try {
            // Get historical data
            const historicalData = await this._getHistoricalData(metric);
            
            // Analyze patterns and seasonality
            const analysis = await HistoricalAnalytics.analyzeSeasonality({
                metrics: [metric]
            });
            
            // Calculate baseline thresholds
            const baselineThresholds = this._calculateBaselineThresholds(historicalData);
            
            // Adjust for seasonality
            const seasonalThresholds = this._adjustForSeasonality(
                baselineThresholds,
                analysis.seasonality[metric]
            );
            
            // Add dynamic components
            const dynamicThresholds = await this._addDynamicComponents(
                seasonalThresholds,
                metric
            );
            
            return {
                metric,
                thresholds: dynamicThresholds,
                confidence: this._calculateThresholdConfidence(dynamicThresholds),
                nextUpdate: new Date(Date.now() + this.updateInterval)
            };
        } catch (error) {
            logger.error('Threshold prediction error:', error);
            throw error;
        }
    }

    async groupAlerts(alerts) {
        try {
            const groups = new Map();
            
            // Sort alerts by timestamp
            const sortedAlerts = [...alerts].sort((a, b) => a.timestamp - b.timestamp);
            
            for (const alert of sortedAlerts) {
                const existingGroup = this._findMatchingGroup(groups, alert);
                
                if (existingGroup) {
                    existingGroup.alerts.push(alert);
                    existingGroup.summary = this._updateGroupSummary(existingGroup);
                } else {
                    const newGroup = this._createAlertGroup(alert);
                    groups.set(newGroup.id, newGroup);
                }
            }
            
            return Array.from(groups.values());
        } catch (error) {
            logger.error('Alert grouping error:', error);
            throw error;
        }
    }

    async predictRootCause(alert) {
        try {
            // Gather context data
            const context = await this._gatherAlertContext(alert);
            
            // Analyze related metrics
            const relatedMetrics = await this._analyzeRelatedMetrics(context);
            
            // Identify potential causes
            const causes = this._identifyPotentialCauses(relatedMetrics);
            
            // Rank causes by probability
            const rankedCauses = this._rankCausesByProbability(causes);
            
            return {
                alert,
                causes: rankedCauses,
                confidence: this._calculateCauseConfidence(rankedCauses),
                recommendations: this._generateCauseRecommendations(rankedCauses)
            };
        } catch (error) {
            logger.error('Root cause prediction error:', error);
            throw error;
        }
    }

    async predictImpact(alert) {
        try {
            // Analyze alert severity
            const severity = await this._analyzeAlertSeverity(alert);
            
            // Identify affected components
            const affectedComponents = await this._identifyAffectedComponents(alert);
            
            // Predict propagation
            const propagation = await this._predictAlertPropagation(
                alert,
                affectedComponents
            );
            
            // Calculate business impact
            const businessImpact = this._calculateBusinessImpact(
                severity,
                affectedComponents,
                propagation
            );
            
            return {
                alert,
                severity,
                affectedComponents,
                propagation,
                businessImpact,
                mitigation: this._generateMitigationStrategies(businessImpact)
            };
        } catch (error) {
            logger.error('Impact prediction error:', error);
            throw error;
        }
    }

    async predictPriority(alert) {
        try {
            // Get impact prediction
            const impact = await this.predictImpact(alert);
            
            // Analyze urgency factors
            const urgency = await this._analyzeUrgencyFactors(alert, impact);
            
            // Calculate base priority
            const basePriority = this._calculateBasePriority(impact, urgency);
            
            // Adjust for business context
            const adjustedPriority = this._adjustForBusinessContext(
                basePriority,
                alert
            );
            
            return {
                alert,
                priority: adjustedPriority,
                factors: {
                    impact,
                    urgency,
                    businessContext: this._getBusinessContextFactors(alert)
                },
                recommendations: this._generatePriorityRecommendations(adjustedPriority)
            };
        } catch (error) {
            logger.error('Priority prediction error:', error);
            throw error;
        }
    }

    // Private helper methods
    _initializeAlertSystem() {
        setInterval(() => {
            this._updateAlertThresholds().catch(error => {
                logger.error('Error updating alert thresholds:', error);
            });
        }, this.updateInterval);
    }

    async _updateAlertThresholds() {
        const configs = await AlertConfig.find({});
        
        for (const config of configs) {
            const thresholds = await this.predictThresholds(config.metric);
            await AlertConfig.findByIdAndUpdate(config._id, {
                thresholds: thresholds.thresholds
            });
        }
    }

    _calculateBaselineThresholds(data) {
        const stats = TimeSeriesAnalysis.calculateStatistics(data);
        
        return {
            warning: stats.mean + stats.stdDev,
            critical: stats.mean + (2 * stats.stdDev),
            emergency: stats.mean + (3 * stats.stdDev)
        };
    }

    _adjustForSeasonality(thresholds, seasonality) {
        const adjustedThresholds = {};
        
        for (const [level, value] of Object.entries(thresholds)) {
            adjustedThresholds[level] = value * (1 + seasonality.strength);
        }
        
        return adjustedThresholds;
    }

    async _addDynamicComponents(thresholds, metric) {
        const realtimeData = await RealTimeAnalytics.analyzeTrafficPattern(metric);
        
        return Object.entries(thresholds).reduce((adjusted, [level, value]) => {
            adjusted[level] = value * (1 + realtimeData.changes.magnitude);
            return adjusted;
        }, {});
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
            alert.timestamp - group.lastUpdate <= this.groupingTimeWindow &&
            alert.type === group.type &&
            this._haveSimilarAttributes(alert, group.attributes)
        );
    }

    _createAlertGroup(alert) {
        return {
            id: this._generateGroupId(),
            type: alert.type,
            attributes: this._extractAlertAttributes(alert),
            alerts: [alert],
            created: alert.timestamp,
            lastUpdate: alert.timestamp,
            summary: this._createGroupSummary(alert)
        };
    }

    async _analyzeAlertSeverity(alert) {
        const metrics = await this._getRelatedMetrics(alert);
        const baseline = await this._getBaselineMetrics(alert.type);
        
        return {
            level: this._calculateSeverityLevel(metrics, baseline),
            confidence: this._calculateSeverityConfidence(metrics),
            factors: this._identifySeverityFactors(metrics, baseline)
        };
    }

    _calculateBusinessImpact(severity, components, propagation) {
        return {
            immediate: this._calculateImmediateImpact(severity, components),
            potential: this._calculatePotentialImpact(propagation),
            financial: this._estimateFinancialImpact(severity, components, propagation),
            userExperience: this._estimateUserImpact(severity, components)
        };
    }

    _calculateBasePriority(impact, urgency) {
        const impactScore = this._calculateImpactScore(impact);
        const urgencyScore = this._calculateUrgencyScore(urgency);
        
        return {
            level: this._combinePriorityScores(impactScore, urgencyScore),
            confidence: (impact.confidence + urgency.confidence) / 2,
            factors: { impact: impactScore, urgency: urgencyScore }
        };
    }
}

export default new PredictiveAlerts();
