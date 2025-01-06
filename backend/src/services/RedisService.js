import Redis from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.useFallback = false;
        this.init();
    }

    init() {
        try {
            if (process.env.NODE_ENV === 'test') {
                this.setupMockClient();
            } else {
                this.setupRedisClient();
            }
        } catch (error) {
            logger.error('Redis initialization error:', error);
            this.setupFallbackClient();
        }
    }

    setupMockClient() {
        this.client = {
            on: () => this,
            get: () => Promise.resolve(null),
            set: () => Promise.resolve('OK'),
            del: () => Promise.resolve(1),
            incr: () => Promise.resolve(1),
            expire: () => Promise.resolve(1),
            ttl: () => Promise.resolve(-2),
            quit: () => Promise.resolve('OK'),
            ping: () => Promise.resolve('PONG')
        };
        this.isConnected = true;
    }

    setupFallbackClient() {
        logger.warn('Using in-memory fallback for Redis');
        this.useFallback = true;
        this.isConnected = true;
        this.storage = new Map();
        this.client = {
            get: (key) => Promise.resolve(this.storage.get(key) || null),
            set: (key, value) => {
                this.storage.set(key, value);
                return Promise.resolve('OK');
            },
            del: (key) => {
                const existed = this.storage.delete(key);
                return Promise.resolve(existed ? 1 : 0);
            },
            incr: (key) => {
                const value = (this.storage.get(key) || 0) + 1;
                this.storage.set(key, value);
                return Promise.resolve(value);
            },
            expire: () => Promise.resolve(1),
            ttl: () => Promise.resolve(300),
            quit: () => Promise.resolve('OK'),
            ping: () => Promise.resolve('PONG')
        };
    }

    setupRedisClient() {
        const options = {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            showFriendlyErrorStack: true,
            lazyConnect: true,
            connectTimeout: 10000,
            disconnectTimeout: 2000,
            commandTimeout: 5000,
            retryUnfulfilledCommands: true,
            reconnectOnError: (err) => {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            }
        };

        // Use Redis URL if available
        const redisUrl = process.env.REDIS_URL;
        this.client = redisUrl ? new Redis(redisUrl, options) : new Redis(options);

        this.client.on('connect', () => {
            this.isConnected = true;
            logger.info('Redis connected successfully');
        });

        this.client.on('error', (err) => {
            logger.error('Redis connection error:', err);
            if (!this.useFallback) {
                this.setupFallbackClient();
            }
        });

        this.client.on('close', () => {
            this.isConnected = false;
            logger.warn('Redis connection closed');
            if (!this.useFallback) {
                this.setupFallbackClient();
            }
        });

        // Connect to Redis
        this.client.connect().catch(err => {
            logger.error('Redis connection failed:', err);
            this.setupFallbackClient();
        });
    }

    async executeCommand(command, ...args) {
        try {
            if (this.useFallback || !this.client[command]) {
                // Use fallback implementation for unknown commands
                switch (command) {
                    case 'get':
                    case 'set':
                    case 'del':
                    case 'incr':
                    case 'expire':
                    case 'ttl':
                    case 'ping':
                        return this.client[command](...args);
                    default:
                        logger.warn(`Unsupported Redis command in fallback mode: ${command}`);
                        return Promise.resolve(null);
                }
            }
            return await this.client[command](...args);
        } catch (error) {
            logger.error(`Redis command error (${command}):`, error);
            if (!this.useFallback) {
                this.setupFallbackClient();
                return this.executeCommand(command, ...args);
            }
            throw error;
        }
    }

    async ping() {
        return this.executeCommand('ping');
    }

    async get(key) {
        return this.executeCommand('get', key);
    }

    async set(key, value, ttl = null) {
        if (ttl) {
            return this.executeCommand('set', key, value, 'EX', ttl);
        }
        return this.executeCommand('set', key, value);
    }

    async del(key) {
        return this.executeCommand('del', key);
    }

    async incr(key) {
        return this.executeCommand('incr', key);
    }

    async expire(key, seconds) {
        return this.executeCommand('expire', key, seconds);
    }

    async ttl(key) {
        return this.executeCommand('ttl', key);
    }

    async disconnect() {
        if (this.client && !this.useFallback) {
            await this.client.quit();
            this.isConnected = false;
        }
    }
}

const redisService = new RedisService();
export default redisService;
