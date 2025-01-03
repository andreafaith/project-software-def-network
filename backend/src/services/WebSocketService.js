import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

class WebSocketService {
    constructor() {
        this.io = null;
        this.redisClient = null;
        this.subscribers = new Map();
    }

    async initialize(server) {
        try {
            // Initialize Redis clients for Socket.IO adapter
            const pubClient = createClient({ url: process.env.REDIS_URL });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);

            // Initialize Socket.IO with Redis adapter
            this.io = new Server(server, {
                cors: {
                    origin: process.env.CORS_ORIGIN || '*',
                    methods: ['GET', 'POST']
                },
                pingTimeout: 60000,
                pingInterval: 25000
            });

            this.io.adapter(createAdapter(pubClient, subClient));

            // Set up authentication middleware
            this.io.use(async (socket, next) => {
                try {
                    const token = socket.handshake.auth.token;
                    if (!token) {
                        return next(new Error('Authentication token required'));
                    }

                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    socket.user = decoded;
                    next();
                } catch (error) {
                    next(new Error('Invalid authentication token'));
                }
            });

            // Handle connections
            this.io.on('connection', this.handleConnection.bind(this));

            logger.info('WebSocket server initialized successfully');
        } catch (error) {
            logger.error('WebSocket initialization error:', error);
            throw error;
        }
    }

    handleConnection(socket) {
        logger.info(`Client connected: ${socket.id}`);

        // Handle subscriptions
        socket.on('subscribe', async (data) => {
            try {
                await this.handleSubscription(socket, data);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Handle unsubscriptions
        socket.on('unsubscribe', async (data) => {
            try {
                await this.handleUnsubscription(socket, data);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });
    }

    async handleSubscription(socket, { type, id, options = {} }) {
        // Validate subscription request
        if (!type) {
            throw new Error('Subscription type is required');
        }

        // Handle different subscription types
        switch (type) {
            case 'device:metrics':
                await this.subscribeToDeviceMetrics(socket, id, options);
                break;
            case 'device:status':
                await this.subscribeToDeviceStatus(socket, id);
                break;
            case 'alerts':
                await this.subscribeToAlerts(socket, options);
                break;
            case 'ml:predictions':
                await this.subscribeToMLPredictions(socket, options);
                break;
            default:
                throw new Error(`Unknown subscription type: ${type}`);
        }

        // Track subscription
        if (!this.subscribers.has(socket.id)) {
            this.subscribers.set(socket.id, new Set());
        }
        this.subscribers.get(socket.id).add(`${type}:${id || 'all'}`);

        socket.emit('subscribed', { type, id });
        logger.info(`Client ${socket.id} subscribed to ${type}${id ? `:${id}` : ''}`);
    }

    async handleUnsubscription(socket, { type, id }) {
        const subscriptions = this.subscribers.get(socket.id);
        if (subscriptions) {
            subscriptions.delete(`${type}:${id || 'all'}`);
        }

        socket.emit('unsubscribed', { type, id });
        logger.info(`Client ${socket.id} unsubscribed from ${type}${id ? `:${id}` : ''}`);
    }

    handleDisconnection(socket) {
        this.subscribers.delete(socket.id);
        logger.info(`Client disconnected: ${socket.id}`);
    }

    // Subscription handlers
    async subscribeToDeviceMetrics(socket, deviceId, options) {
        if (!deviceId) {
            throw new Error('Device ID is required for metrics subscription');
        }

        const room = `metrics:${deviceId}`;
        await socket.join(room);
    }

    async subscribeToDeviceStatus(socket, deviceId) {
        if (!deviceId) {
            throw new Error('Device ID is required for status subscription');
        }

        const room = `status:${deviceId}`;
        await socket.join(room);
    }

    async subscribeToAlerts(socket, options) {
        const { severity, types } = options;
        const rooms = [];

        if (severity) {
            rooms.push(`alerts:severity:${severity}`);
        }
        if (types && Array.isArray(types)) {
            types.forEach(type => rooms.push(`alerts:type:${type}`));
        }
        if (rooms.length === 0) {
            rooms.push('alerts:all');
        }

        await Promise.all(rooms.map(room => socket.join(room)));
    }

    async subscribeToMLPredictions(socket, options) {
        const { models } = options;
        const rooms = [];

        if (models && Array.isArray(models)) {
            models.forEach(model => rooms.push(`ml:${model}`));
        } else {
            rooms.push('ml:all');
        }

        await Promise.all(rooms.map(room => socket.join(room)));
    }

    // Broadcast methods
    broadcastMetrics(deviceId, metrics) {
        this.io.to(`metrics:${deviceId}`).emit('device:metrics', {
            deviceId,
            metrics,
            timestamp: new Date().toISOString()
        });
    }

    broadcastStatus(deviceId, status) {
        this.io.to(`status:${deviceId}`).emit('device:status', {
            deviceId,
            status,
            timestamp: new Date().toISOString()
        });
    }

    broadcastAlert(alert) {
        const rooms = [
            'alerts:all',
            `alerts:severity:${alert.severity}`,
            `alerts:type:${alert.type}`
        ];

        rooms.forEach(room => {
            this.io.to(room).emit('alert:new', {
                ...alert,
                timestamp: new Date().toISOString()
            });
        });
    }

    broadcastMLPrediction(model, prediction) {
        const rooms = ['ml:all', `ml:${model}`];

        rooms.forEach(room => {
            this.io.to(room).emit('ml:prediction', {
                model,
                prediction,
                timestamp: new Date().toISOString()
            });
        });
    }
}

export default new WebSocketService();
