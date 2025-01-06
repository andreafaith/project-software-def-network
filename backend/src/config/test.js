const config = {
  port: 3001,
  jwtSecret: 'test-jwt-secret-key',
  mongoUri: 'mongodb://localhost:27017/test',
  mongoOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: null
  },
  logging: {
    level: 'debug',
    file: 'test.log'
  },
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};

module.exports = config;
