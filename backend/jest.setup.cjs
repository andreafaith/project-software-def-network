const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const dotenv = require('dotenv');
const { TextEncoder, TextDecoder } = require('util');

// Load environment variables
dotenv.config({ path: '.env.test' });

// Add TextEncoder/TextDecoder to global (needed for some ES modules)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Create a single instance of MongoMemoryServer
let mongod;

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  quit: jest.fn()
};

// Mock Socket.IO server
const mockSocketServer = {
  use: jest.fn(),
  on: jest.fn(),
  emit: jest.fn()
};

// Mock modules before any tests run
jest.mock('ioredis', () => jest.fn(() => mockRedisClient));
jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockSocketServer)
}));

// Connect to the in-memory database
beforeAll(async () => {
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
