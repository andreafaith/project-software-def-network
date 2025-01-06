import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/eyenet',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    },
    session: {
        secret: process.env.SESSION_SECRET || 'session-secret',
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10)
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    },
    uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;
