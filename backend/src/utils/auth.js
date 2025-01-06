import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export const generateToken = (payload, options = {}) => {
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: options.expiresIn || '24h',
        ...options
    });
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (error) {
        return null;
    }
};

export const extractToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.substring(7);
    }
    return null;
};

export const authenticate = (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
};

export const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};
