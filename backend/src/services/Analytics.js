import NetworkDevice from '../models/NetworkDevice.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import AlertConfig from '../models/AlertConfig.js';
import logger from '../utils/logger.js';

class Analytics {
    // Device Analytics
    static async getDeviceStatistics() {
        try {
            const stats = await NetworkDevice.aggregate([
                {
                    $group: {
                        _id: null,
                        totalDevices: { $sum: 1 },
                        devicesByType: {
                            $push: {
                                type: '$type',
                                status: '$status'
                            }
                        },
                        activeDevices: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                            }
                        },
                        inactiveDevices: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0]
                            }
                        },
                        averageUptime: { $avg: '$uptime' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalDevices: 1,
                        activeDevices: 1,
                        inactiveDevices: 1,
                        averageUptime: 1,
                        devicesByType: {
                            $arrayToObject: {
                                $map: {
                                    input: {
                                        $setUnion: {
                                            $map: {
                                                input: '$devicesByType',
                                                as: 'device',
                                                in: {
                                                    k: { $concat: ['$$device.type', '_', '$$device.status'] },
                                                    v: 1
                                                }
                                            }
                                        }
                                    },
                                    as: 'item',
                                    in: ['$$item.k', {
                                        $size: {
                                            $filter: {
                                                input: '$devicesByType',
                                                as: 'dev',
                                                cond: {
                                                    $eq: [
                                                        { $concat: ['$$dev.type', '_', '$$dev.status'] },
                                                        '$$item.k'
                                                    ]
                                                }
                                            }
                                        }
                                    }]
                                }
                            }
                        }
                    }
                }
            ]);

            return stats[0] || {
                totalDevices: 0,
                activeDevices: 0,
                inactiveDevices: 0,
                averageUptime: 0,
                devicesByType: {}
            };
        } catch (error) {
            logger.error('Error getting device statistics:', error);
            throw error;
        }
    }

    // Performance Analytics
    static async getPerformanceMetrics(timeRange) {
        try {
            const { start, end } = timeRange;
            const metrics = await NetworkMetrics.aggregate([
                {
                    $match: {
                        'metrics.timestamp': {
                            $gte: new Date(start),
                            $lte: new Date(end)
                        }
                    }
                },
                {
                    $group: {
                        _id: '$deviceId',
                        avgCpuUsage: { $avg: '$metrics.cpu.usage' },
                        avgMemoryUsage: { $avg: '$metrics.memory.used' },
                        maxCpuUsage: { $max: '$metrics.cpu.usage' },
                        maxMemoryUsage: { $max: '$metrics.memory.used' },
                        avgBandwidthIn: { $avg: '$metrics.bandwidth.inbound.value' },
                        avgBandwidthOut: { $avg: '$metrics.bandwidth.outbound.value' },
                        dataPoints: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'networkdevices',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'device'
                    }
                },
                {
                    $unwind: '$device'
                },
                {
                    $project: {
                        _id: 1,
                        deviceName: '$device.name',
                        deviceType: '$device.type',
                        metrics: {
                            cpu: {
                                average: '$avgCpuUsage',
                                max: '$maxCpuUsage'
                            },
                            memory: {
                                average: '$avgMemoryUsage',
                                max: '$maxMemoryUsage'
                            },
                            bandwidth: {
                                inbound: '$avgBandwidthIn',
                                outbound: '$avgBandwidthOut'
                            }
                        },
                        dataPoints: 1
                    }
                }
            ]);

            return metrics;
        } catch (error) {
            logger.error('Error getting performance metrics:', error);
            throw error;
        }
    }

    // Alert Analytics
    static async getAlertStatistics(timeRange) {
        try {
            const { start, end } = timeRange;
            const stats = await AlertConfig.aggregate([
                {
                    $lookup: {
                        from: 'alerts',
                        let: { configId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$configId', '$$configId'] },
                                            { $gte: ['$timestamp', new Date(start)] },
                                            { $lte: ['$timestamp', new Date(end)] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'alerts'
                    }
                },
                {
                    $group: {
                        _id: '$severity',
                        totalConfigs: { $sum: 1 },
                        activeConfigs: {
                            $sum: { $cond: ['$enabled', 1, 0] }
                        },
                        totalAlerts: { $sum: { $size: '$alerts' } }
                    }
                }
            ]);

            return stats;
        } catch (error) {
            logger.error('Error getting alert statistics:', error);
            throw error;
        }
    }

    // Trend Analysis
    static async analyzeTrends(deviceId, metric, timeRange, interval = '1h') {
        try {
            const { start, end } = timeRange;
            const intervalMillis = this._getIntervalMillis(interval);

            const trends = await NetworkMetrics.aggregate([
                {
                    $match: {
                        deviceId,
                        'metrics.timestamp': {
                            $gte: new Date(start),
                            $lte: new Date(end)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $subtract: [
                                { $toLong: '$metrics.timestamp' },
                                { $mod: [{ $toLong: '$metrics.timestamp' }, intervalMillis] }
                            ]
                        },
                        avgValue: { $avg: `$metrics.${metric}` },
                        minValue: { $min: `$metrics.${metric}` },
                        maxValue: { $max: `$metrics.${metric}` }
                    }
                },
                {
                    $sort: { _id: 1 }
                },
                {
                    $project: {
                        _id: 0,
                        timestamp: { $toDate: '$_id' },
                        average: '$avgValue',
                        minimum: '$minValue',
                        maximum: '$maxValue'
                    }
                }
            ]);

            return trends;
        } catch (error) {
            logger.error('Error analyzing trends:', error);
            throw error;
        }
    }

    // Capacity Planning
    static async analyzeCapacity(timeRange, projectionDays = 30) {
        try {
            const { start, end } = timeRange;
            const metrics = await NetworkMetrics.aggregate([
                {
                    $match: {
                        'metrics.timestamp': {
                            $gte: new Date(start),
                            $lte: new Date(end)
                        }
                    }
                },
                {
                    $group: {
                        _id: '$deviceId',
                        cpuTrend: {
                            $avg: {
                                $subtract: [
                                    { $last: '$metrics.cpu.usage' },
                                    { $first: '$metrics.cpu.usage' }
                                ]
                            }
                        },
                        memoryTrend: {
                            $avg: {
                                $subtract: [
                                    { $last: '$metrics.memory.used' },
                                    { $first: '$metrics.memory.used' }
                                ]
                            }
                        },
                        bandwidthTrend: {
                            $avg: {
                                $subtract: [
                                    { $last: '$metrics.bandwidth.total.value' },
                                    { $first: '$metrics.bandwidth.total.value' }
                                ]
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'networkdevices',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'device'
                    }
                },
                {
                    $unwind: '$device'
                },
                {
                    $project: {
                        _id: 1,
                        deviceName: '$device.name',
                        deviceType: '$device.type',
                        projections: {
                            cpu: {
                                current: '$device.metrics.cpu.usage',
                                projected: {
                                    $add: [
                                        '$device.metrics.cpu.usage',
                                        { $multiply: ['$cpuTrend', projectionDays] }
                                    ]
                                }
                            },
                            memory: {
                                current: '$device.metrics.memory.used',
                                projected: {
                                    $add: [
                                        '$device.metrics.memory.used',
                                        { $multiply: ['$memoryTrend', projectionDays] }
                                    ]
                                }
                            },
                            bandwidth: {
                                current: '$device.metrics.bandwidth.total.value',
                                projected: {
                                    $add: [
                                        '$device.metrics.bandwidth.total.value',
                                        { $multiply: ['$bandwidthTrend', projectionDays] }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);

            return metrics;
        } catch (error) {
            logger.error('Error analyzing capacity:', error);
            throw error;
        }
    }

    // Helper Methods
    static _getIntervalMillis(interval) {
        const units = {
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000
        };
        const value = parseInt(interval);
        const unit = interval.slice(-1);
        return value * (units[unit] || units['h']);
    }
}

export default Analytics;
