import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true,
        unique: true
    },
    path: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    metadata: {
        width: Number,
        height: Number,
        format: String,
        colorSpace: String
    },
    preprocessingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    preprocessingData: {
        normalizedPath: String,
        thumbnail: String,
        features: Object,
        preprocessingSteps: [{
            step: String,
            status: String,
            timestamp: Date,
            details: Object
        }]
    },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'analyzed', 'failed'],
        default: 'uploaded'
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
imageSchema.index({ userId: 1, createdAt: -1 });
imageSchema.index({ status: 1 });
imageSchema.index({ preprocessingStatus: 1 });

const Image = mongoose.model('Image', imageSchema);

export default Image;
