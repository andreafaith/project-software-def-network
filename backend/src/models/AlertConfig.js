import mongoose from 'mongoose';

const thresholdSchema = new mongoose.Schema({
    metric: {
        type: String,
        required: true,
        enum: [
            'cpu_usage',
            'memory_usage',
            'disk_usage',
            'bandwidth_usage',
            'latency',
            'packet_loss',
            'error_rate',
            'uptime',
            'temperature'
        ]
    },
    operator: {
        type: String,
        required: true,
        enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'neq']
    },
    value: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        default: 0, // Duration in seconds for the condition to persist before alerting
        min: 0
    }
});

const notificationChannelSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['email', 'slack', 'webhook', 'sms']
    },
    config: {
        // Email configuration
        emailAddresses: [String],
        // Slack configuration
        slackWebhook: String,
        slackChannel: String,
        // Webhook configuration
        webhookUrl: String,
        // SMS configuration
        phoneNumbers: [String]
    },
    enabled: {
        type: Boolean,
        default: true
    }
});

const alertConfigSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    severity: {
        type: String,
        required: true,
        enum: ['critical', 'high', 'medium', 'low', 'info'],
        default: 'medium'
    },
    enabled: {
        type: Boolean,
        default: true
    },
    scope: {
        type: {
            type: String,
            required: true,
            enum: ['device', 'device_type', 'network', 'custom']
        },
        deviceIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NetworkDevice'
        }],
        deviceTypes: [String],
        networks: [String],
        customFilter: mongoose.Schema.Types.Mixed
    },
    conditions: {
        type: [thresholdSchema],
        required: true
    },
    notifications: [notificationChannelSchema],
    cooldown: {
        type: Number,
        default: 300, // 5 minutes in seconds
        min: 0
    },
    autoResolve: {
        enabled: {
            type: Boolean,
            default: true
        },
        duration: {
            type: Number,
            default: 3600 // 1 hour in seconds
        }
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
alertConfigSchema.index({ name: 1 });
alertConfigSchema.index({ severity: 1 });
alertConfigSchema.index({ enabled: 1 });
alertConfigSchema.index({ 'scope.deviceIds': 1 });
alertConfigSchema.index({ 'scope.deviceTypes': 1 });

// Methods
alertConfigSchema.methods.isApplicableToDevice = function(device) {
    if (!this.enabled) return false;

    const { type, deviceIds, deviceTypes, networks } = this.scope;

    switch (type) {
        case 'device':
            return deviceIds.some(id => id.equals(device._id));
        case 'device_type':
            return deviceTypes.includes(device.type);
        case 'network':
            return device.interfaces.some(iface => 
                networks.some(network => iface.ipAddress.startsWith(network))
            );
        case 'custom':
            // Implement custom filter logic here
            return true;
        default:
            return false;
    }
};

alertConfigSchema.methods.evaluateConditions = function(metrics) {
    return this.conditions.every(condition => {
        const value = metrics[condition.metric];
        if (value === undefined) return false;

        switch (condition.operator) {
            case 'gt': return value > condition.value;
            case 'lt': return value < condition.value;
            case 'gte': return value >= condition.value;
            case 'lte': return value <= condition.value;
            case 'eq': return value === condition.value;
            case 'neq': return value !== condition.value;
            default: return false;
        }
    });
};

const AlertConfig = mongoose.model('AlertConfig', alertConfigSchema);

export default AlertConfig;
