import mongoose from 'mongoose';

const batchJobSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    imageIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image'
    }],
    status: {
        type: String,
        enum: ['queued', 'processing', 'completed', 'failed'],
        default: 'queued'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    options: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    results: [{
        status: String,
        value: mongoose.Schema.Types.Mixed,
        reason: String
    }],
    error: String,
    metadata: {
        totalImages: Number,
        processedImages: Number,
        startTime: Date,
        endTime: Date,
        processingStats: {
            averageTimePerImage: Number,
            totalProcessingTime: Number,
            successRate: Number
        }
    }
}, {
    timestamps: true
});

// Indexes
batchJobSchema.index({ userId: 1 });
batchJobSchema.index({ status: 1 });
batchJobSchema.index({ createdAt: 1 });
batchJobSchema.index({ 'metadata.startTime': 1 });

// Methods
batchJobSchema.methods.updateProgress = async function(processedCount) {
    this.metadata.processedImages = processedCount;
    if (this.metadata.startTime && processedCount === this.metadata.totalImages) {
        this.metadata.endTime = new Date();
        this.status = 'completed';
        
        // Calculate processing stats
        const totalTime = this.metadata.endTime - this.metadata.startTime;
        const successfulResults = this.results.filter(r => r.status === 'fulfilled');
        
        this.metadata.processingStats = {
            averageTimePerImage: totalTime / this.metadata.totalImages,
            totalProcessingTime: totalTime,
            successRate: successfulResults.length / this.metadata.totalImages
        };
    }
    return this.save();
};

batchJobSchema.methods.fail = async function(error) {
    this.status = 'failed';
    this.error = error.message;
    this.metadata.endTime = new Date();
    return this.save();
};

// Statics
batchJobSchema.statics.getActiveJobs = function() {
    return this.find({
        status: { $in: ['queued', 'processing'] }
    }).sort({ 'metadata.startTime': 1 });
};

batchJobSchema.statics.cleanupOldJobs = async function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.deleteMany({
        status: { $in: ['completed', 'failed'] },
        createdAt: { $lt: cutoffDate }
    });
};

const BatchJob = mongoose.model('BatchJob', batchJobSchema);

export default BatchJob;
