import logger from './logger.js';
import mongoose from 'mongoose';

class DataAggregation {
    constructor(options = {}) {
        this.defaultBucketSize = options.defaultBucketSize || '1h';
        this.maxDataPoints = options.maxDataPoints || 1000;
        this.retentionPolicies = options.retentionPolicies || {
            raw: '7d',
            '1h': '30d',
            '1d': '365d',
            '1w': '5y'
        };
    }

    async aggregateTimeSeries(collection, query, options = {}) {
        try {
            const bucketSize = options.bucketSize || this.defaultBucketSize;
            const metrics = options.metrics || ['value'];
            
            const pipeline = [
                { $match: query },
                {
                    $bucket: {
                        groupBy: '$timestamp',
                        boundaries: this._generateBucketBoundaries(query.timestamp, bucketSize),
                        default: 'other',
                        output: this._generateBucketOutput(metrics)
                    }
                },
                { $sort: { '_id': 1 } }
            ];

            return collection.aggregate(pipeline);
        } catch (error) {
            logger.error('Time series aggregation error:', error);
            throw error;
        }
    }

    async downsampleData(data, targetPoints) {
        try {
            const factor = Math.ceil(data.length / targetPoints);
            if (factor <= 1) return data;

            const downsampled = [];
            for (let i = 0; i < data.length; i += factor) {
                const bucket = data.slice(i, Math.min(i + factor, data.length));
                downsampled.push(this._aggregateBucket(bucket));
            }

            return downsampled;
        } catch (error) {
            logger.error('Data downsampling error:', error);
            throw error;
        }
    }

    async applyRetentionPolicy(collection, policy) {
        try {
            const cutoffDates = {};
            
            // Calculate cutoff dates for each granularity
            for (const [granularity, retention] of Object.entries(this.retentionPolicies)) {
                cutoffDates[granularity] = this._calculateCutoffDate(retention);
            }

            // Delete old data based on retention policy
            const deletionPromises = Object.entries(cutoffDates).map(([granularity, cutoff]) => {
                return collection.deleteMany({
                    granularity,
                    timestamp: { $lt: cutoff }
                });
            });

            const results = await Promise.all(deletionPromises);
            return this._summarizeRetentionResults(results);
        } catch (error) {
            logger.error('Retention policy application error:', error);
            throw error;
        }
    }

    // Private helper methods
    _generateBucketBoundaries(timeRange, bucketSize) {
        const { $gte: start, $lte: end } = timeRange;
        const boundaries = [];
        let current = new Date(start);

        while (current <= end) {
            boundaries.push(new Date(current));
            current = this._addBucketInterval(current, bucketSize);
        }

        return boundaries;
    }

    _generateBucketOutput(metrics) {
        const output = {
            count: { $sum: 1 },
            timestamp_first: { $min: '$timestamp' },
            timestamp_last: { $max: '$timestamp' }
        };

        metrics.forEach(metric => {
            output[`${metric}_avg`] = { $avg: `$${metric}` };
            output[`${metric}_min`] = { $min: `$${metric}` };
            output[`${metric}_max`] = { $max: `$${metric}` };
            output[`${metric}_sum`] = { $sum: `$${metric}` };
            output[`${metric}_stddev`] = { $stdDevPop: `$${metric}` };
        });

        return output;
    }

    _aggregateBucket(bucket) {
        const aggregated = {
            timestamp: bucket[0].timestamp,
            count: bucket.length
        };

        // Calculate statistics for each metric in the bucket
        const metrics = Object.keys(bucket[0]).filter(key => key !== 'timestamp');
        
        metrics.forEach(metric => {
            const values = bucket.map(item => item[metric]);
            aggregated[metric] = {
                avg: this._calculateMean(values),
                min: Math.min(...values),
                max: Math.max(...values),
                stddev: this._calculateStdDev(values)
            };
        });

        return aggregated;
    }

    _addBucketInterval(date, bucketSize) {
        const [value, unit] = this._parseBucketSize(bucketSize);
        const newDate = new Date(date);

        switch (unit) {
            case 'm':
                newDate.setMinutes(newDate.getMinutes() + value);
                break;
            case 'h':
                newDate.setHours(newDate.getHours() + value);
                break;
            case 'd':
                newDate.setDate(newDate.getDate() + value);
                break;
            case 'w':
                newDate.setDate(newDate.getDate() + (value * 7));
                break;
            case 'M':
                newDate.setMonth(newDate.getMonth() + value);
                break;
            default:
                throw new Error('Invalid bucket size unit');
        }

        return newDate;
    }

    _parseBucketSize(bucketSize) {
        const match = bucketSize.match(/^(\d+)([mhdwM])$/);
        if (!match) {
            throw new Error('Invalid bucket size format');
        }
        return [parseInt(match[1]), match[2]];
    }

    _calculateCutoffDate(retention) {
        const [value, unit] = this._parseBucketSize(retention);
        const cutoff = new Date();

        switch (unit) {
            case 'd':
                cutoff.setDate(cutoff.getDate() - value);
                break;
            case 'w':
                cutoff.setDate(cutoff.getDate() - (value * 7));
                break;
            case 'M':
                cutoff.setMonth(cutoff.getMonth() - value);
                break;
            case 'y':
                cutoff.setFullYear(cutoff.getFullYear() - value);
                break;
            default:
                throw new Error('Invalid retention unit');
        }

        return cutoff;
    }

    _calculateMean(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    _calculateStdDev(values) {
        const mean = this._calculateMean(values);
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        const variance = this._calculateMean(squareDiffs);
        return Math.sqrt(variance);
    }

    _summarizeRetentionResults(results) {
        return results.reduce((summary, result, index) => {
            const granularity = Object.keys(this.retentionPolicies)[index];
            summary[granularity] = {
                deletedCount: result.deletedCount,
                cutoffDate: this._calculateCutoffDate(this.retentionPolicies[granularity])
            };
            return summary;
        }, {});
    }
}

export default DataAggregation;
