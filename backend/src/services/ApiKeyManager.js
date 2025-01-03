import crypto from 'crypto';
import User from '../models/User.js';
import logger from '../utils/logger.js';

class ApiKeyManager {
    // Generate a new API key
    static generateApiKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Generate API key with expiration
    static async createApiKey(userId, name, expiresIn = '30d') {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const apiKey = this.generateApiKey();
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + parseInt(expiresIn));

            // Add new API key to user's keys array
            user.apiKeys.push({
                key: apiKey,
                name,
                createdAt: new Date(),
                expiresAt: expirationDate,
                lastUsed: null,
                isActive: true
            });

            await user.save();
            logger.info(`New API key created for user ${userId}`);

            return {
                apiKey,
                expiresAt: expirationDate
            };
        } catch (error) {
            logger.error('API key creation error:', error);
            throw error;
        }
    }

    // Rotate API key
    static async rotateApiKey(userId, oldKeyId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const keyIndex = user.apiKeys.findIndex(k => k._id.toString() === oldKeyId);
            if (keyIndex === -1) {
                throw new Error('API key not found');
            }

            const oldKey = user.apiKeys[keyIndex];
            const newApiKey = this.generateApiKey();

            // Create new key with same expiration period
            const timeLeft = oldKey.expiresAt - new Date();
            const expirationDate = new Date(Date.now() + timeLeft);

            // Add new key
            user.apiKeys.push({
                key: newApiKey,
                name: `${oldKey.name} (rotated)`,
                createdAt: new Date(),
                expiresAt: expirationDate,
                lastUsed: null,
                isActive: true
            });

            // Deactivate old key (keep for audit)
            user.apiKeys[keyIndex].isActive = false;
            user.apiKeys[keyIndex].rotatedAt = new Date();

            await user.save();
            logger.info(`API key rotated for user ${userId}`);

            return {
                apiKey: newApiKey,
                expiresAt: expirationDate
            };
        } catch (error) {
            logger.error('API key rotation error:', error);
            throw error;
        }
    }

    // Validate API key
    static async validateApiKey(apiKey) {
        try {
            const user = await User.findOne({
                'apiKeys.key': apiKey,
                'apiKeys.isActive': true
            });

            if (!user) {
                return null;
            }

            const key = user.apiKeys.find(k => k.key === apiKey);
            if (!key || key.expiresAt < new Date()) {
                return null;
            }

            // Update last used timestamp
            key.lastUsed = new Date();
            await user.save();

            return {
                userId: user._id,
                keyId: key._id,
                expiresAt: key.expiresAt
            };
        } catch (error) {
            logger.error('API key validation error:', error);
            throw error;
        }
    }

    // Check for expiring keys and notify
    static async checkExpiringKeys(daysBeforeExpiration = 7) {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + daysBeforeExpiration);

            const users = await User.find({
                'apiKeys.isActive': true,
                'apiKeys.expiresAt': { $lte: expirationDate }
            });

            for (const user of users) {
                const expiringKeys = user.apiKeys.filter(key => 
                    key.isActive && key.expiresAt <= expirationDate
                );

                if (expiringKeys.length > 0) {
                    // TODO: Implement notification system
                    logger.info(`User ${user._id} has ${expiringKeys.length} keys expiring soon`);
                }
            }
        } catch (error) {
            logger.error('Expiring keys check error:', error);
            throw error;
        }
    }
}

export default ApiKeyManager;
