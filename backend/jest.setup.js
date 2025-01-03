import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Redis } from 'ioredis';
import { jest } from '@jest/globals';

let mongoServer;

// Setup MongoDB Memory Server
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// Clear database between tests
beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

// Cleanup after tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Mock Redis
jest.mock('ioredis', () => {
    const redisMock = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn(),
        scan: jest.fn(),
        pipeline: jest.fn(),
        multi: jest.fn(),
        exec: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn()
    };

    return jest.fn(() => redisMock);
});

// Mock WebSocket
jest.mock('ws', () => {
    const wsMock = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn()
    };

    return jest.fn(() => wsMock);
});

// Global test timeout
jest.setTimeout(30000);

// Custom matchers
expect.extend({
    toBeWithinRange(received, floor, ceiling) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () =>
                    `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false
            };
        }
    }
});
