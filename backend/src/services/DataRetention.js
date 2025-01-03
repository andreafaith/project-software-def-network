import NetworkMetrics from '../models/NetworkMetrics.js';
import logger from '../utils/logger.js';

class DataRetention {
    static DEFAULT_POLICIES = {
        raw: {
            duration: 7, // days
            aggregation: null
        },
        hourly: {
            duration: 30, // days
            aggregation: '1h'
        },
        daily: {
            duration: 90, // days
            aggregation: '1d'
        },
        monthly: {
            duration: 365, // days
            aggregation: '30d'
        }
    };

    // Apply retention policies
    static async applyRetentionPolicies() {
        try {
            const results = {};
            
            // Apply each policy
            for (const [policyName, policy] of Object.entries(this.DEFAULT_POLICIES)) {
                const result = await this._applyPolicy(policy);
                results[policyName] = result;
            }

            logger.info('Applied retention policies:', results);
            return results;
        } catch (error) {
            logger.error('Error applying retention policies:', error);
            throw error;
        }
    }

    // Apply single policy
    static async _applyPolicy(policy) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - policy.duration);

            if (policy.aggregation) {
                // Aggregate data before deletion
                await this._aggregateData(cutoffDate, policy.aggregation);
            }

            // Delete old data
            const result = await NetworkMetrics.deleteMany({
                'metrics.timestamp': { $lt: cutoffDate },
                aggregation: policy.aggregation || 'raw'
            });

            return {
                deletedCount: result.deletedCount,
                cutoffDate,
                aggregation: policy.aggregation
            };
        } catch (error) {
            logger.error('Error applying retention policy:', error);
            throw error;
        }
    }

    // Aggregate data
    static async _aggregateData(cutoffDate, interval) {
        try {
            const aggregatedData = await NetworkMetrics.aggregate([
                {
                    $match: {
                        'metrics.timestamp': { $lt: cutoffDate },
                        aggregation: 'raw'
                    }
                },
                {
                    $group: {
                        _id: {
                            deviceId: '$deviceId',
                            interval: {
                                $subtract: [
                                    { $toLong: '$metrics.timestamp' },
                                    { $mod: [
                                        { $toLong: '$metrics.timestamp' },
                                        this._getIntervalMillis(interval)
                                    ]}
                                ]
                            }
                        },
                        metrics: {
                            $push: '$metrics'
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        deviceId: '$_id.deviceId',
                        timestamp: { $toDate: '$_id.interval' },
                        metrics: {
                            cpu: {
                                usage: { $avg: '$metrics.cpu.usage' },
                                temperature: { $avg: '$metrics.cpu.temperature' }
                            },
                            memory: {
                                used: { $avg: '$metrics.memory.used' },
                                free: { $avg: '$metrics.memory.free' }
                            },
                            bandwidth: {
                                inbound: { $avg: '$metrics.bandwidth.inbound.value' },
                                outbound: { $avg: '$metrics.bandwidth.outbound.value' }
                            }
                        },
                        aggregation: interval
                    }
                }
            ]);

            // Save aggregated data
            if (aggregatedData.length > 0) {
                await NetworkMetrics.insertMany(aggregatedData);
            }

            return aggregatedData.length;
        } catch (error) {
            logger.error('Error aggregating data:', error);
            throw error;
        }
    }

    // Get interval in milliseconds
    static _getIntervalMillis(interval) {
        const units = {
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000
        };
        const value = parseInt(interval);
        const unit = interval.slice(-1);
        return value * (units[unit] || units['h']);
    }

    // Schedule retention policy execution
    static scheduleRetention(cronSchedule = '0 0 * * *') { // Default: daily at midnight
        try {
            const schedule = require('node-schedule');
            
            schedule.scheduleJob(cronSchedule, async () => {
                logger.info('Starting scheduled retention policy execution');
                try {
                    await this.applyRetentionPolicies();
                    logger.info('Completed scheduled retention policy execution');
                } catch (error) {
                    logger.error('Error in scheduled retention policy execution:', error);
                }
            });

            logger.info(`Scheduled retention policy execution with schedule: ${cronSchedule}`);
        } catch (error) {
            logger.error('Error scheduling retention policy execution:', error);
            throw error;
        }
    }

    // Get retention policy status
    static async getRetentionStatus() {
        try {
            const status = {};

            for (const [policyName, policy] of Object.entries(this.DEFAULT_POLICIES)) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - policy.duration);

                const count = await NetworkMetrics.countDocuments({
                    'metrics.timestamp': { $lt: cutoffDate },
                    aggregation: policy.aggregation || 'raw'
                });

                status[policyName] = {
                    policy,
                    recordsToRetain: count,
                    nextExecutionDate: this._getNextExecutionDate()
                };
            }

            return status;
        } catch (error) {
            logger.error('Error getting retention status:', error);
            throw error;
        }
    }

    // Get next execution date
    static _getNextExecutionDate() {
        const now = new Date();
        const next = new Date(now);
        next.setHours(24, 0, 0, 0); // Next midnight
        return next;
    }
}

export default DataRetention;
