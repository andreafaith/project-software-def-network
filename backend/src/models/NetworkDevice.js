import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
    building: String,
    floor: String,
    room: String,
    coordinates: {
        x: Number,
        y: Number
    }
});

const networkInterfaceSchema = new mongoose.Schema({
    name: String,
    type: {
        type: String,
        enum: ['ethernet', 'wifi', 'fiber', 'other']
    },
    macAddress: String,
    ipAddress: String,
    speed: Number, // in Mbps
    duplex: {
        type: String,
        enum: ['full', 'half', 'auto']
    },
    status: {
        type: String,
        enum: ['up', 'down', 'unknown']
    }
});

const networkDeviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    type: {
        type: String,
        enum: ['router', 'switch', 'access_point', 'server', 'workstation', 'printer', 'other'],
        required: true
    },
    manufacturer: String,
    model: String,
    serialNumber: String,
    firmwareVersion: String,
    location: locationSchema,
    interfaces: [networkInterfaceSchema],
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance', 'error'],
        default: 'active'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    uptime: Number, // in seconds
    metrics: {
        cpu: {
            usage: Number, // percentage
            temperature: Number // celsius
        },
        memory: {
            total: Number, // bytes
            used: Number, // bytes
            free: Number // bytes
        },
        storage: {
            total: Number, // bytes
            used: Number, // bytes
            free: Number // bytes
        }
    },
    connectionInfo: {
        protocol: {
            type: String,
            enum: ['ssh', 'telnet', 'snmp', 'http', 'https']
        },
        port: Number,
        credentials: {
            username: String,
            // Password should be stored securely in a separate system
            authMethod: {
                type: String,
                enum: ['password', 'key', 'token']
            }
        }
    },
    tags: [String],
    notes: String,
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes for better query performance
networkDeviceSchema.index({ type: 1 });
networkDeviceSchema.index({ status: 1 });
networkDeviceSchema.index({ 'interfaces.ipAddress': 1 });
networkDeviceSchema.index({ 'location.building': 1, 'location.floor': 1 });

// Virtual for device age
networkDeviceSchema.virtual('deviceAge').get(function() {
    return Date.now() - this.createdAt;
});

// Method to check if device needs maintenance
networkDeviceSchema.methods.needsMaintenance = function() {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    return this.deviceAge > thirtyDays || this.status === 'error';
};

// Method to update device metrics
networkDeviceSchema.methods.updateMetrics = function(newMetrics) {
    this.metrics = { ...this.metrics, ...newMetrics };
    this.lastSeen = new Date();
    return this.save();
};

const NetworkDevice = mongoose.model('NetworkDevice', networkDeviceSchema);

export default NetworkDevice;
