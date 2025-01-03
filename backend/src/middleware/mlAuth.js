import jwt from 'jsonwebtoken';
import ApiKey from '../models/ApiKey.js';
import logger from '../utils/logger.js';

export const mlAuth = async (req, res, next) => {
    try {
        const apiKey = req.header('X-ML-API-Key');
        const token = req.header('X-ML-Token');

        if (!apiKey && !token) {
            return res.status(401).json({ error: 'ML authentication required' });
        }

        if (apiKey) {
            // Validate API key
            const validKey = await ApiKey.findOne({
                key: apiKey,
                type: 'ml',
                status: 'active'
            });

            if (!validKey) {
                return res.status(401).json({ error: 'Invalid ML API key' });
            }

            // Update last used timestamp
            validKey.lastUsed = new Date();
            await validKey.save();

            req.mlClient = {
                id: validKey.userId,
                type: 'api_key',
                permissions: validKey.permissions || ['predict']
            };
        } else if (token) {
            // Validate JWT token
            const decoded = jwt.verify(token, process.env.ML_JWT_SECRET);
            
            if (!decoded.mlAccess) {
                return res.status(401).json({ error: 'Invalid ML token' });
            }

            req.mlClient = {
                id: decoded.userId,
                type: 'token',
                permissions: decoded.permissions || ['predict']
            };
        }

        next();
    } catch (error) {
        logger.error('ML authentication error:', error);
        res.status(401).json({ error: 'ML authentication failed' });
    }
};

export const mlAdminAuth = async (req, res, next) => {
    try {
        if (!req.mlClient) {
            return res.status(401).json({ error: 'ML authentication required' });
        }

        if (!req.mlClient.permissions.includes('admin')) {
            return res.status(403).json({ error: 'ML admin access required' });
        }

        next();
    } catch (error) {
        logger.error('ML admin authentication error:', error);
        res.status(403).json({ error: 'ML admin authentication failed' });
    }
};

export const mlRateLimit = async (req, res, next) => {
    try {
        if (!req.mlClient) {
            return res.status(401).json({ error: 'ML authentication required' });
        }

        const key = await ApiKey.findOne({
            userId: req.mlClient.id,
            type: 'ml'
        });

        if (key) {
            const now = Date.now();
            const windowMs = 60 * 1000; // 1 minute window
            const maxRequests = key.rateLimit || 100; // Default to 100 requests per minute

            // Initialize or update request count
            if (!key.rateLimitData || now - key.rateLimitData.windowStart > windowMs) {
                key.rateLimitData = {
                    windowStart: now,
                    count: 1
                };
            } else {
                key.rateLimitData.count++;
            }

            if (key.rateLimitData.count > maxRequests) {
                return res.status(429).json({ 
                    error: 'Rate limit exceeded',
                    resetTime: new Date(key.rateLimitData.windowStart + windowMs)
                });
            }

            await key.save();
        }

        next();
    } catch (error) {
        logger.error('ML rate limit error:', error);
        res.status(500).json({ error: 'Rate limit check failed' });
    }
};
