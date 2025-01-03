import { createClient } from 'redis';
import logger from '../utils/logger.js';

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async initialize() {
        try {
            this.client = createClient({
                url: process.env.REDIS_URL,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            return new Error('Redis connection retries exceeded');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            // Error handling
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
            logger.error('Redis initialization error:', error);
            throw error;
        }
    }

    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error(`Redis get error for key ${key}:`, error);
            return null;
        }
    }

    async set(key, value, options = {}) {
        try {
            const stringValue = JSON.stringify(value);
            if (options.ttl) {
                await this.client.set(key, stringValue, {
                    EX: options.ttl
                });
            } else {
                await this.client.set(key, stringValue);
            }
            return true;
        } catch (error) {
            logger.error(`Redis set error for key ${key}:`, error);
            return false;
        }
    }

    async delete(key) {
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error(`Redis delete error for key ${key}:`, error);
            return false;
        }
    }

    async exists(key) {
        try {
            return await this.client.exists(key);
        } catch (error) {
            logger.error(`Redis exists error for key ${key}:`, error);
            return false;
        }
    }

    async increment(key) {
        try {
            return await this.client.incr(key);
        } catch (error) {
            logger.error(`Redis increment error for key ${key}:`, error);
            return null;
        }
    }

    async expire(key, seconds) {
        try {
            return await this.client.expire(key, seconds);
        } catch (error) {
            logger.error(`Redis expire error for key ${key}:`, error);
            return false;
        }
    }

    async keys(pattern) {
        try {
            return await this.client.keys(pattern);
        } catch (error) {
            logger.error(`Redis keys error for pattern ${pattern}:`, error);
            return [];
        }
    }

    async flush() {
        try {
            await this.client.flushDb();
            return true;
        } catch (error) {
            logger.error('Redis flush error:', error);
            return false;
        }
    }

    // Cache middleware for Express
    cacheMiddleware(ttl = 300) { // Default 5 minutes
        return async (req, res, next) => {
            if (!this.isConnected) {
                return next();
            }

            const key = `cache:${req.method}:${req.originalUrl}`;
            try {
                const cachedResponse = await this.get(key);
                if (cachedResponse) {
                    return res.json(cachedResponse);
                }

                // Modify res.json to cache the response
                const originalJson = res.json;
                res.json = async (body) => {
                    await this.set(key, body, { ttl });
                    res.json = originalJson;
                    return res.json(body);
                };

                next();
            } catch (error) {
                logger.error('Cache middleware error:', error);
                next();
            }
        };
    }

    // Rate limiting middleware
    rateLimiter(options = { window: 60, max: 100 }) {
        return async (req, res, next) => {
            if (!this.isConnected) {
                return next();
            }

            const key = `ratelimit:${req.ip}`;
            try {
                const requests = await this.increment(key);
                if (requests === 1) {
                    await this.expire(key, options.window);
                }

                if (requests > options.max) {
                    return res.status(429).json({
                        error: 'Too many requests',
                        retryAfter: options.window
                    });
                }

                next();
            } catch (error) {
                logger.error('Rate limiter error:', error);
                next();
            }
        };
    }
}

export default new RedisService();
