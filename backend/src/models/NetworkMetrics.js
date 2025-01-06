import mongoose from 'mongoose';

const metricValueSchema = {
    type: Number,
    required: true,
    validate: {
        validator: Number.isFinite,
        message: '{VALUE} is not a valid metric value'
    }
};

const metricDataPointSchema = {
    value: metricValueSchema,
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    quality: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'high'
    }
};

const networkMetricsSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true
    },
    interfaceName: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        version: {
            type: String,
            required: true,
            default: '1.0'
        },
        collectionMethod: {
            type: String,
            required: true,
            default: 'automated'
        },
        source: {
            type: String,
            required: true,
            default: 'system'
        }
    },
    metrics: {
        bandwidth: {
            inbound: {
                value: metricValueSchema,
                unit: {
                    type: String,
                    default: 'bps'
                }
            },
            outbound: {
                value: metricValueSchema,
                unit: {
                    type: String,
                    default: 'bps'
                }
            },
            total: {
                value: metricValueSchema,
                unit: {
                    type: String,
                    default: 'bps'
                }
            },
            utilization: {
                value: metricValueSchema,
                unit: {
                    type: String,
                    default: '%'
                }
            }
        },
        latency: {
            value: metricValueSchema,
            unit: {
                type: String,
                default: 'ms'
            }
        },
        packetLoss: {
            value: metricValueSchema,
            unit: {
                type: String,
                default: '%'
            }
        },
        jitter: {
            value: metricValueSchema,
            unit: {
                type: String,
                default: 'ms'
            }
        },
        errors: {
            inbound: {
                value: metricValueSchema,
                unit: {
                    type: String,
                    default: 'count'
                }
            },
            outbound: {
                value: metricValueSchema,
                unit: {
                    type: String,
                    default: 'count'
                }
            }
        },
        retransmission: {
            value: metricValueSchema,
            unit: {
                type: String,
                default: 'count'
            }
        }
    }
}, {
    timestamps: true
});

networkMetricsSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

// Create compound index on deviceId and timestamp
networkMetricsSchema.index({ deviceId: 1, timestamp: -1 });

// Static method to aggregate metrics
networkMetricsSchema.statics.aggregateMetrics = async function(deviceId, timeRange, aggregationType) {
    const pipeline = [
        { $match: { deviceId: deviceId } },
        { $match: { 'metrics.timestamp': { $gte: timeRange.start, $lte: timeRange.end } } },
        {
            $group: {
                _id: null,
                avgBandwidth: { $avg: '$metrics.bandwidth.total.value' },
                maxBandwidth: { $max: '$metrics.bandwidth.total.value' },
                avgLatency: { $avg: '$metrics.latency.value' },
                maxLatency: { $max: '$metrics.latency.value' },
                totalErrors: {
                    $sum: {
                        $add: [
                            '$metrics.errors.inbound.value',
                            '$metrics.errors.outbound.value'
                        ]
                    }
                }
            }
        }
    ];

    return this.aggregate(pipeline);
};

// Static method to get metrics with options
networkMetricsSchema.statics.getMetrics = async function(deviceId, options = {}) {
    const query = { deviceId: deviceId };

    // Apply time range filter if provided
    if (options.timeRange) {
        query['metrics.timestamp'] = {
            $gte: options.timeRange.start,
            $lte: options.timeRange.end
        };
    }

    // Apply metric type filter if provided
    if (options.metricType) {
        query[`metrics.${options.metricType}`] = { $exists: true };
    }

    const metrics = await this.find(query)
        .sort({ 'metrics.timestamp': -1 })
        .limit(options.limit || 1000)
        .lean();

    // Transform metrics into time series format
    return metrics.map(metric => ({
        timestamp: metric.metrics.timestamp,
        value: options.metricType ? 
            metric.metrics[options.metricType].value :
            metric.metrics.bandwidth.total.value,
        type: options.metricType || 'bandwidth'
    }));
};

// Method to add metric data point
networkMetricsSchema.methods.addMetricDataPoint = function(metricType, value) {
    if (!this.metrics[metricType]) {
        throw new Error(`Invalid metric type: ${metricType}`);
    }
    
    this.metrics[metricType].value = value;
    this.metrics[metricType].timestamp = new Date();
    return this.save();
};

// Method to get metrics within time range
networkMetricsSchema.methods.getMetricsInRange = function(startTime, endTime) {
    return this.model('NetworkMetrics').find({
        deviceId: this.deviceId,
        'metrics.timestamp': { $gte: startTime, $lte: endTime }
    });
};

const NetworkMetrics = mongoose.model('NetworkMetrics', networkMetricsSchema);

export default NetworkMetrics;
