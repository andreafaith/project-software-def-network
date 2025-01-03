import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const apiKeySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    key: {
        type: String,
        unique: true,
        default: () => uuidv4().replace(/-/g, '')
    },
    type: {
        type: String,
        enum: ['ml', 'api', 'admin'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'revoked'],
        default: 'active'
    },
    permissions: [{
        type: String,
        enum: ['predict', 'train', 'admin', 'read', 'write']
    }],
    rateLimit: {
        type: Number,
        default: 100 // requests per minute
    },
    rateLimitData: {
        windowStart: Date,
        count: Number
    },
    lastUsed: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: () => {
            const date = new Date();
            date.setFullYear(date.getFullYear() + 1); // Default 1 year expiry
            return date;
        }
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Indexes - removed duplicate key index since we have unique: true
apiKeySchema.index({ userId: 1 });
apiKeySchema.index({ type: 1 });
apiKeySchema.index({ status: 1 });
apiKeySchema.index({ expiresAt: 1 });

// Methods
apiKeySchema.methods.isValid = function() {
    return this.status === 'active' && 
           (!this.expiresAt || this.expiresAt > new Date());
};

apiKeySchema.methods.revoke = async function() {
    this.status = 'revoked';
    return this.save();
};

apiKeySchema.methods.resetRateLimit = function() {
    this.rateLimitData = {
        windowStart: new Date(),
        count: 0
    };
};

// Statics
apiKeySchema.statics.generateKey = async function(userId, type, options = {}) {
    const key = new this({
        userId,
        type,
        name: options.name || `${type}-key-${Date.now()}`,
        permissions: options.permissions || ['predict'],
        rateLimit: options.rateLimit,
        expiresAt: options.expiresAt,
        metadata: options.metadata
    });

    await key.save();
    return key;
};

apiKeySchema.statics.findValidKey = async function(keyString) {
    const key = await this.findOne({ 
        key: keyString,
        status: 'active'
    });

    if (!key || !key.isValid()) {
        return null;
    }

    return key;
};

// Middleware
apiKeySchema.pre('save', function(next) {
    if (this.isNew && !this.key) {
        this.key = uuidv4().replace(/-/g, '');
    }
    next();
});

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

export default ApiKey;
