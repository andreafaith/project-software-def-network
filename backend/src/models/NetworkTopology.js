import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
    sourceDevice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NetworkDevice',
        required: true
    },
    targetDevice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NetworkDevice',
        required: true
    },
    sourceInterface: String,
    targetInterface: String,
    linkType: {
        type: String,
        enum: ['ethernet', 'fiber', 'wireless', 'virtual'],
        required: true
    },
    bandwidth: Number, // in Mbps
    status: {
        type: String,
        enum: ['active', 'inactive', 'degraded'],
        default: 'active'
    },
    metrics: {
        latency: Number, // in milliseconds
        packetLoss: Number, // percentage
        throughput: Number, // in Mbps
        errorRate: Number // errors per second
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const networkTopologySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        index: true // Combined unique and index
    },
    description: String,
    version: {
        type: Number,
        default: 1
    },
    connections: [connectionSchema],
    metadata: {
        createdBy: String,
        lastModifiedBy: String,
        notes: String
    }
}, {
    timestamps: true
});

// Indexes for connections
networkTopologySchema.index({ 'connections.sourceDevice': 1 });
networkTopologySchema.index({ 'connections.targetDevice': 1 });

// Method to add connection
networkTopologySchema.methods.addConnection = function(connection) {
    this.connections.push(connection);
    this.version += 1;
    return this.save();
};

// Method to remove connection
networkTopologySchema.methods.removeConnection = function(connectionId) {
    this.connections = this.connections.filter(conn => 
        conn._id.toString() !== connectionId.toString()
    );
    this.version += 1;
    return this.save();
};

// Method to update connection metrics
networkTopologySchema.methods.updateConnectionMetrics = function(connectionId, metrics) {
    const connection = this.connections.id(connectionId);
    if (connection) {
        connection.metrics = { ...connection.metrics, ...metrics };
        connection.lastUpdated = new Date();
        return this.save();
    }
    return null;
};

// Method to get device connections
networkTopologySchema.methods.getDeviceConnections = function(deviceId) {
    return this.connections.filter(conn => 
        conn.sourceDevice.toString() === deviceId.toString() ||
        conn.targetDevice.toString() === deviceId.toString()
    );
};

const NetworkTopology = mongoose.model('NetworkTopology', networkTopologySchema);

export default NetworkTopology;
