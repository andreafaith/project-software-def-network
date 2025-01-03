import rateLimit from 'express-rate-limit';
import SessionManager from '../services/SessionManager.js';
import logger from '../utils/logger.js';

// Rate limiting configuration
export const sessionRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many session requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

export const validateSession = async (req, res, next) => {
    try {
        const sessionId = req.headers['x-session-id'];
        
        if (!sessionId) {
            return res.status(401).json({ 
                status: 'error',
                message: 'No session ID provided' 
            });
        }

        const session = await SessionManager.validateSession(sessionId);
        
        if (!session) {
            return res.status(401).json({ 
                status: 'error',
                message: 'Invalid or expired session' 
            });
        }

        // Attach session data to request
        req.session = session;
        next();
    } catch (error) {
        logger.error('Session validation error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Session validation failed' 
        });
    }
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.session) {
            return res.status(401).json({ 
                status: 'error',
                message: 'No session found' 
            });
        }

        if (!roles.includes(req.session.role)) {
            return res.status(403).json({ 
                status: 'error',
                message: 'Insufficient permissions' 
            });
        }

        next();
    };
};
