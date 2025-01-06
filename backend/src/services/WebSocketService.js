import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import logger from '../utils/logger.js';
import { verifyToken } from '../middleware/auth.js';

class WebSocketService {
    constructor() {
        this.io = null;
        this.pubClient = null;
        this.subClient = null;
        this.redisEnabled = false;
    }

    async initialize(server) {
        // Initialize Socket.IO
        this.io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Setup authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
                if (!token) {
                    return next(new Error('Authentication token is required'));
                }

                const user = await verifyToken(token);
                if (!user) {
                    return next(new Error('Invalid authentication token'));
                }

                socket.user = user;
                next();
            } catch (error) {
                logger.error('WebSocket authentication error:', error);
                next(new Error('Authentication failed'));
            }
        });

        // Initialize Redis adapter if Redis is available
        try {
            if (process.env.NODE_ENV !== 'test') {
                await this.initializeRedis();
            }
        } catch (error) {
            logger.warn('Redis adapter initialization failed, falling back to in-memory adapter:', error);
            this.redisEnabled = false;
        }

        // Setup event handlers
        this.io.on('connection', (socket) => {
            logger.info(`Client connected: ${socket.id}`);

            socket.on('disconnect', () => {
                logger.info(`Client disconnected: ${socket.id}`);
            });

            socket.on('error', (error) => {
                logger.error(`Socket error for client ${socket.id}:`, error);
            });
        });

        logger.info('WebSocket service initialized successfully');
    }

    async initializeRedis() {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            throw new Error('Redis URL is not configured');
        }

        try {
            // Create Redis clients using Redis URL
            this.pubClient = new Redis(redisUrl);
            this.subClient = new Redis(redisUrl);

            // Handle Redis client events
            for (const client of [this.pubClient, this.subClient]) {
                client.on('error', (error) => {
                    logger.error('Redis client error:', error);
                });

                client.on('close', () => {
                    logger.warn('Redis client connection closed');
                });

                client.on('reconnecting', () => {
                    logger.info('Redis client reconnecting...');
                });

                client.on('ready', () => {
                    logger.info('Redis client ready');
                });
            }

            // Wait for both clients to be ready
            await Promise.all([
                new Promise((resolve) => this.pubClient.once('ready', resolve)),
                new Promise((resolve) => this.subClient.once('ready', resolve))
            ]);

            // Create and set Redis adapter
            this.io.adapter(createAdapter(this.pubClient, this.subClient));
            this.redisEnabled = true;
            logger.info('Redis adapter initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Redis adapter:', error);
            throw error;
        }
    }

    emit(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    async cleanup() {
        try {
            if (this.redisEnabled) {
                await Promise.all([
                    this.pubClient?.disconnect(),
                    this.subClient?.disconnect()
                ]);
            }
            await this.io?.close();
            logger.info('WebSocket service cleaned up successfully');
        } catch (error) {
            logger.error('Error during WebSocket service cleanup:', error);
        }
    }
}

export default new WebSocketService();
