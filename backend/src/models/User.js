import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const apiKeySchema = new mongoose.Schema({
    key: { type: String, required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    lastUsed: { type: Date },
    isActive: { type: Boolean, default: true },
    rotatedAt: { type: Date },
    metadata: { type: Object }
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: function() {
            return !this.oauth; // Password not required if using OAuth
        }
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    oauth: {
        provider: {
            type: String,
            enum: ['google', 'github', null],
            default: null
        },
        id: String,
        lastLogin: Date
    },
    apiKeys: [apiKeySchema],
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    lastLogin: {
        type: Date
    },
    metadata: {
        type: Object
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    const user = this;
    if (user.isModified('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 10);
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
