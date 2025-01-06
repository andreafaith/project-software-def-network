import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';

export const auth = {
    verifyToken: async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: 'Authentication token required' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            req.user = user;
            next();
        } catch (error) {
            logger.error('Token verification failed:', error);
            return res.status(401).json({ error: 'Invalid authentication token' });
        }
    },

    checkRole: (roles) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            next();
        };
    },

    checkPermissions: (requiredPermissions) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const hasAllPermissions = requiredPermissions.every(permission =>
                req.user.permissions?.includes(permission)
            );

            if (!hasAllPermissions) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            next();
        };
    },

    validateSession: async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const user = await User.findById(req.user._id);
            if (!user || user.sessionVersion !== req.user.sessionVersion) {
                return res.status(401).json({ error: 'Session expired' });
            }

            next();
        } catch (error) {
            logger.error('Session validation failed:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    adminAuth: async (req, res, next) => {
        try {
            await auth.verifyToken(req, res, async () => {
                if (req.user.role !== 'admin') {
                    return res.status(403).json({ error: 'Admin access required' });
                }
                next();
            });
        } catch (error) {
            logger.error('Admin authentication failed:', error);
            return res.status(401).json({ error: 'Admin authentication failed' });
        }
    }
};

export { auth as default };
export const { verifyToken, checkRole, checkPermissions, validateSession, adminAuth } = auth;
