import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
    imageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    modelVersion: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'processing', 'completed', 'failed'],
        default: 'queued'
    },
    results: {
        predictions: [{
            label: String,
            confidence: Number,
            boundingBox: {
                x: Number,
                y: Number,
                width: Number,
                height: Number
            },
            metadata: Object
        }],
        summary: {
            detectionCount: Number,
            averageConfidence: Number,
            processingTime: Number
        }
    },
    diagnostics: {
        startTime: Date,
        endTime: Date,
        duration: Number,
        modelLatency: Number,
        preprocessingLatency: Number,
        errorDetails: Object
    },
    metadata: {
        deviceInfo: Object,
        parameters: Object,
        version: Object
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
analysisSchema.index({ imageId: 1 });
analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ status: 1 });
analysisSchema.index({ 'results.predictions.label': 1 });

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;
