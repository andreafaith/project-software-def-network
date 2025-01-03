import crypto from 'crypto';
import logger from '../utils/logger.js';
import EncryptionService from './EncryptionService.js';
import { Redis } from 'ioredis';

class ApiSecurity {
    constructor() {
        this.redis = new Redis(process.env.REDIS_URL);
        this.keyPrefix = 'api:key:';
        this.noncePrefix = 'api:nonce:';
        this.nonceExpiry = 300; // 5 minutes
        this.maxRequestAge = 300000; // 5 minutes in milliseconds
    }

    async generateApiCredentials(userId, scope = ['read']) {
        try {
            // Generate API key and secret
            const apiKey = EncryptionService.generateApiKey();
            const apiSecret = EncryptionService.generateApiKey();

            // Hash the API key and secret
            const hashedKey = await EncryptionService.hashApiKey(apiKey);
            const hashedSecret = await EncryptionService.hashApiKey(apiSecret);

            // Store credentials
            await this._storeApiCredentials(userId, {
                keyHash: hashedKey.hash,
                keySalt: hashedKey.salt,
                secretHash: hashedSecret.hash,
                secretSalt: hashedSecret.salt,
                scope,
                createdAt: new Date(),
                lastUsed: null
            });

            return {
                apiKey,
                apiSecret,
                scope
            };
        } catch (error) {
            logger.error('Error generating API credentials:', error);
            throw error;
        }
    }

    async validateApiKey(apiKey) {
        try {
            // Get stored credentials
            const credentials = await this._getStoredCredentials(apiKey);
            if (!credentials) {
                return false;
            }

            // Verify API key
            const isValid = await EncryptionService.verifyApiKey(
                apiKey,
                credentials.keyHash,
                credentials.keySalt
            );

            if (isValid) {
                // Update last used timestamp
                await this._updateLastUsed(apiKey);
            }

            return isValid;
        } catch (error) {
            logger.error('Error validating API key:', error);
            throw error;
        }
    }

    async signRequest(request, apiSecret) {
        try {
            // Generate nonce
            const nonce = crypto.randomBytes(16).toString('hex');
            
            // Get current timestamp
            const timestamp = Date.now().toString();
            
            // Create signature components
            const signatureData = {
                method: request.method,
                path: request.path,
                body: request.body,
                nonce,
                timestamp
            };

            // Generate signature
            const signature = await EncryptionService.signRequest(
                signatureData,
                apiSecret
            );

            return {
                signature,
                nonce,
                timestamp
            };
        } catch (error) {
            logger.error('Error signing request:', error);
            throw error;
        }
    }

    async verifyRequestSignature(request, signature, nonce, timestamp) {
        try {
            // Verify request age
            if (!this._verifyRequestAge(timestamp)) {
                return false;
            }

            // Verify nonce hasn't been used
            if (!await this._verifyNonce(nonce)) {
                return false;
            }

            // Get API credentials
            const apiKey = request.headers['x-api-key'];
            const credentials = await this._getStoredCredentials(apiKey);
            if (!credentials) {
                return false;
            }

            // Create signature data
            const signatureData = {
                method: request.method,
                path: request.path,
                body: request.body,
                nonce,
                timestamp
            };

            // Verify signature
            return await EncryptionService.verifySignature(
                signatureData,
                signature,
                credentials.apiSecret
            );
        } catch (error) {
            logger.error('Error verifying request signature:', error);
            throw error;
        }
    }

    // Private helper methods
    async _storeApiCredentials(userId, credentials) {
        const key = `${this.keyPrefix}${userId}`;
        await this.redis.hmset(key, credentials);
    }

    async _getStoredCredentials(apiKey) {
        const pattern = `${this.keyPrefix}*`;
        const keys = await this.redis.keys(pattern);

        for (const key of keys) {
            const credentials = await this.redis.hgetall(key);
            const isMatch = await EncryptionService.verifyApiKey(
                apiKey,
                credentials.keyHash,
                credentials.keySalt
            );

            if (isMatch) {
                return credentials;
            }
        }

        return null;
    }

    async _updateLastUsed(apiKey) {
        const credentials = await this._getStoredCredentials(apiKey);
        if (credentials) {
            const userId = credentials.userId;
            await this.redis.hset(
                `${this.keyPrefix}${userId}`,
                'lastUsed',
                new Date().toISOString()
            );
        }
    }

    _verifyRequestAge(timestamp) {
        const age = Date.now() - parseInt(timestamp);
        return age <= this.maxRequestAge;
    }

    async _verifyNonce(nonce) {
        const key = `${this.noncePrefix}${nonce}`;
        const exists = await this.redis.exists(key);

        if (exists) {
            return false;
        }

        await this.redis.set(key, '1', 'EX', this.nonceExpiry);
        return true;
    }
}

export default new ApiSecurity();
