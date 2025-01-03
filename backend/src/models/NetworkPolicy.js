import mongoose from 'mongoose';

const networkPolicySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['security', 'qos', 'routing', 'access', 'compliance']
    },
    priority: {
        type: Number,
        required: true,
        min: 1,
        max: 1000
    },
    rules: [{
        name: String,
        condition: {
            type: {
                type: String,
                required: true,
                enum: ['ip', 'port', 'protocol', 'bandwidth', 'time', 'custom']
            },
            operator: {
                type: String,
                required: true,
                enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'between']
            },
            value: mongoose.Schema.Types.Mixed,
            valueEnd: mongoose.Schema.Types.Mixed // For 'between' operator
        },
        action: {
            type: {
                type: String,
                required: true,
                enum: ['allow', 'deny', 'limit', 'redirect', 'log', 'alert']
            },
            parameters: mongoose.Schema.Types.Mixed
        }
    }],
    scope: {
        deviceTypes: [String],
        deviceGroups: [String],
        locations: [String]
    },
    schedule: {
        active: {
            type: Boolean,
            default: true
        },
        startTime: Date,
        endTime: Date,
        recurrence: {
            type: String,
            enum: ['once', 'daily', 'weekly', 'monthly', 'always'],
            default: 'always'
        }
    },
    compliance: {
        standard: String,
        requirement: String,
        controlId: String
    },
    metadata: {
        createdBy: String,
        lastModifiedBy: String,
        version: {
            type: Number,
            default: 1
        },
        tags: [String]
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'draft'
    }
}, {
    timestamps: true
});

// Indexes
networkPolicySchema.index({ name: 1 }, { unique: true });
networkPolicySchema.index({ type: 1, priority: -1 });
networkPolicySchema.index({ 'scope.deviceTypes': 1 });
networkPolicySchema.index({ status: 1 });

// Methods
networkPolicySchema.methods.activate = async function() {
    this.status = 'active';
    return this.save();
};

networkPolicySchema.methods.deactivate = async function() {
    this.status = 'inactive';
    return this.save();
};

networkPolicySchema.methods.archive = async function() {
    this.status = 'archived';
    return this.save();
};

// Statics
networkPolicySchema.statics.findActive = function() {
    return this.find({ status: 'active' }).sort({ priority: 1 });
};

networkPolicySchema.statics.findByDevice = function(deviceType, groups = []) {
    return this.find({
        status: 'active',
        $or: [
            { 'scope.deviceTypes': deviceType },
            { 'scope.deviceGroups': { $in: groups } }
        ]
    }).sort({ priority: 1 });
};

const NetworkPolicy = mongoose.model('NetworkPolicy', networkPolicySchema);

export default NetworkPolicy;
