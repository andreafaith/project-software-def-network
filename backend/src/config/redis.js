import { createClient } from 'redis';
import logger from '../utils/logger.js';

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                retry_strategy: (options) => {
                    if (options.attempt > 10) {
                        return new Error('Redis retry attempts exhausted');
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis Client Connected');
                this.isConnected = true;
            });

            await this.client.connect();
        } catch (error) {
            logger.error('Redis Connection Error:', error);
            throw error;
        }
    }

    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error(`Redis Get Error for key ${key}:`, error);
            throw error;
        }
    }

    async set(key, value, expireSeconds = 3600) {
        try {
            await this.client.set(key, JSON.stringify(value), {
                EX: expireSeconds
            });
        } catch (error) {
            logger.error(`Redis Set Error for key ${key}:`, error);
            throw error;
        }
    }

    async delete(key) {
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error(`Redis Delete Error for key ${key}:`, error);
            throw error;
        }
    }
}

export default new RedisService();
