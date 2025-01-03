import mongoose from 'mongoose';

const metricDataPoint = {
    value: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isFinite,
            message: '{VALUE} is not a valid metric value'
        }
    },
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NetworkDevice',
        required: true
    },
    interfaceName: {
        type: String,
        required: true,
        trim: true
    },
    metrics: {
        bandwidth: {
            inbound: metricDataPoint,
            outbound: metricDataPoint,
            total: metricDataPoint,
            utilization: metricDataPoint
        },
        latency: {
            ...metricDataPoint,
            distribution: {
                min: Number,
                max: Number,
                mean: Number,
                median: Number,
                percentile95: Number,
                standardDeviation: Number
            }
        },
        packetLoss: {
            ...metricDataPoint,
            details: {
                totalPackets: Number,
                lostPackets: Number,
                errorType: {
                    type: String,
                    enum: ['collision', 'congestion', 'corruption', 'unknown']
                }
            }
        },
        errorRate: {
            ...metricDataPoint,
            types: {
                crc: Number,
                fragment: Number,
                collision: Number,
                other: Number
            }
        },
        retransmissionRate: metricDataPoint,
        jitter: metricDataPoint,
        throughput: {
            ...metricDataPoint,
            details: {
                actualBits: Number,
                goodput: Number,
                overhead: Number
            }
        },
        availability: {
            ...metricDataPoint,
            details: {
                uptime: Number,
                downtime: Number,
                lastDowntime: Date,
                mtbf: Number, // Mean Time Between Failures
                mttr: Number  // Mean Time To Recovery
            }
        }
    },
    aggregation: {
        type: String,
        enum: ['raw', '1min', '5min', '15min', '1hour', '1day'],
        default: 'raw',
        required: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    metadata: {
        source: {
            type: String,
            required: true,
            enum: ['snmp', 'api', 'agent', 'manual']
        },
        reliability: {
            type: Number,
            min: 0,
            max: 1,
            default: 1
        },
        collectionMethod: String,
        processingDelay: Number,
        version: String
    }
}, {
    timestamps: true,
    strict: true
});

// Indexes for better query performance
networkMetricsSchema.index({ deviceId: 1, 'metrics.timestamp': 1 });
networkMetricsSchema.index({ deviceId: 1, interfaceName: 1 });
networkMetricsSchema.index({ 'metrics.timestamp': 1 });
networkMetricsSchema.index({ aggregation: 1 });

// Static method to aggregate metrics
networkMetricsSchema.statics.aggregateMetrics = async function(deviceId, timeRange, aggregationType) {
    const pipeline = [
        {
            $match: {
                deviceId: mongoose.Types.ObjectId(deviceId),
                'metrics.timestamp': {
                    $gte: timeRange.start,
                    $lte: timeRange.end
                }
            }
        },
        {
            $group: {
                _id: {
                    deviceId: '$deviceId',
                    interfaceName: '$interfaceName'
                },
                avgBandwidthIn: { $avg: '$metrics.bandwidth.inbound.value' },
                avgBandwidthOut: { $avg: '$metrics.bandwidth.outbound.value' },
                maxBandwidthIn: { $max: '$metrics.bandwidth.inbound.value' },
                maxBandwidthOut: { $max: '$metrics.bandwidth.outbound.value' },
                avgLatency: { $avg: '$metrics.latency.value' },
                avgPacketLoss: { $avg: '$metrics.packetLoss.value' },
                avgErrorRate: { $avg: '$metrics.errorRate.value' }
            }
        }
    ];

    return this.aggregate(pipeline);
};

// Method to add metric data point
networkMetricsSchema.methods.addMetricDataPoint = function(metricType, value) {
    if (this.metrics[metricType]) {
        this.metrics[metricType].value = value;
        this.metrics[metricType].timestamp = new Date();
    }
    return this.save();
};

// Method to get metrics within time range
networkMetricsSchema.methods.getMetricsInRange = function(startTime, endTime) {
    return this.model('NetworkMetrics').find({
        deviceId: this.deviceId,
        'metrics.timestamp': {
            $gte: startTime,
            $lte: endTime
        }
    }).sort({ 'metrics.timestamp': 1 });
};

const NetworkMetrics = mongoose.model('NetworkMetrics', networkMetricsSchema);

export default NetworkMetrics;
