import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import User from '../models/User.js';

let mongoServer;

// Test Database Setup
export const setupTestDB = () => {
    beforeAll(async () => {
        // Close any existing connections
        await mongoose.disconnect();
        
        // Create new server if it doesn't exist
        if (!mongoServer) {
            mongoServer = await MongoMemoryServer.create();
        }
        
        // Connect to the in-memory database
        await mongoose.connect(mongoServer.getUri(), {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    });

    afterEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
            mongoServer = null;
        }
    });
};

// Test User Creation
export const createTestUser = async (role = 'user') => {
    const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role
    });
    return user;
};

// Test Token Generation
export const generateTestToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );
};

// Mock Redis Client
export const mockRedisClient = {
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve('OK')),
    del: jest.fn(() => Promise.resolve(1)),
    exists: jest.fn(() => Promise.resolve(0)),
    expire: jest.fn(() => Promise.resolve(1)),
    incr: jest.fn(() => Promise.resolve(1)),
    ttl: jest.fn(() => Promise.resolve(-2)),
    quit: jest.fn(() => Promise.resolve('OK')),
    on: jest.fn(),
    connect: jest.fn(() => Promise.resolve()),
    disconnect: jest.fn(() => Promise.resolve())
};

// Mock Socket.IO
export const mockSocketIO = {
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    join: jest.fn(),
    leave: jest.fn()
};

// Test Data Generators
export const generateTestDevice = () => ({
    name: 'Test Device',
    type: 'router',
    ipAddress: '192.168.1.1',
    location: {
        building: 'Test Building',
        floor: '1st',
        room: 'Test Room'
    }
});

export const generateTestPolicy = () => ({
    name: 'Test Policy',
    description: 'Test policy description',
    type: 'security',
    priority: 1,
    rules: [{
        name: 'Test Rule',
        condition: {
            type: 'ip',
            operator: 'equals',
            value: '192.168.1.1'
        },
        action: {
            type: 'allow'
        }
    }]
});

// Request Helper
export const createTestRequest = (overrides = {}) => ({
    body: {},
    query: {},
    params: {},
    headers: {},
    ...overrides
});

// Response Helper
export const createTestResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

// Clear all mocks between tests
export const clearMocks = () => {
    jest.clearAllMocks();
    mockRedisClient.get.mockClear();
    mockRedisClient.set.mockClear();
    mockSocketIO.emit.mockClear();
};
