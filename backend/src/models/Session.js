import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    deviceInfo: {
        client: Object,
        os: Object,
        device: Object
    },
    ip: String,
    lastActivity: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 24 * 60 * 60 // TTL index: automatically delete after 24 hours
    }
});

const Session = mongoose.model('Session', sessionSchema);

export default Session;
