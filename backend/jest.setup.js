import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Add TextEncoder/TextDecoder to global (needed for some ES modules)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Redis
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  quit: jest.fn()
};

// Create a single instance of MongoMemoryServer
let mongod;

// Mock Socket.IO
const mockSocketServer = {
  use: jest.fn(),
  on: jest.fn(),
  emit: jest.fn()
};

// Mock modules before any tests run
beforeAll(async () => {
  // Mock Redis
  await jest.unstable_mockModule('ioredis', () => ({
    default: jest.fn(() => mockRedisClient)
  }));

  // Mock Socket.IO
  await jest.unstable_mockModule('socket.io', () => ({
    Server: jest.fn(() => mockSocketServer)
  }));

  // Set up MongoDB Memory Server
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  // Close any existing connections
  await mongoose.disconnect();
  
  // Connect to the in-memory database
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// Clear all test data after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
  // Clear all mocks
  jest.clearAllMocks();
});

// Close database connection after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});
