import rateLimit from 'express-rate-limit';
import { MemoryStore } from 'express-rate-limit';
import logger from '../utils/logger.js';

// Use memory store for development and testing
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

// Create rate limiter options with defaults
const createLimiterOptions = (windowMs, max, type) => {
    const options = {
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        store: new MemoryStore(),
        handler: (req, res) => {
            logger.warn(`${type} rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({
                error: `Too many ${type.toLowerCase()} requests`,
                retryAfter: Math.ceil(windowMs / 1000)
            });
        },
        skip: (req) => isDev || req.ip === '127.0.0.1' || req.ip === '::1',
        keyGenerator: (req) => `${type.toLowerCase()}:${req.ip}`
    };

    return options;
};

// General rate limiter (100 requests per 15 minutes)
const generalOptions = createLimiterOptions(15 * 60 * 1000, 100, 'General');
export const generalLimiter = rateLimit(generalOptions);

// Login attempt limiter (5 attempts per hour)
const loginOptions = createLimiterOptions(60 * 60 * 1000, 5, 'Login');
export const loginLimiter = rateLimit(loginOptions);

// API rate limiter (100 requests per minute)
const apiOptions = createLimiterOptions(60 * 1000, 100, 'API');
export const apiRateLimiter = rateLimit(apiOptions);

// Export options for testing
export const options = {
    general: generalOptions,
    login: loginOptions,
    api: apiOptions
};
