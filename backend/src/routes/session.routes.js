import express from 'express';
import SessionManager from '../services/SessionManager.js';
import { validateSession, sessionRateLimiter, requireRole } from '../middleware/sessionAuth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all active sessions for a user
router.get('/sessions', 
    sessionRateLimiter,
    validateSession,
    async (req, res) => {
        try {
            const sessions = await SessionManager.getUserSessions(req.session.userId);
            res.json({
                status: 'success',
                data: sessions
            });
        } catch (error) {
            logger.error('Get sessions error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve sessions'
            });
        }
    }
);

// Terminate specific session
router.delete('/sessions/:sessionId',
    sessionRateLimiter,
    validateSession,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            
            // Check if user owns the session or is admin
            const sessions = await SessionManager.getUserSessions(req.session.userId);
            const ownsSession = sessions.some(s => s.sessionId === sessionId);
            
            if (!ownsSession && req.session.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Unauthorized to terminate this session'
                });
            }

            await SessionManager.terminateSession(req.session.userId, sessionId);
            res.json({
                status: 'success',
                message: 'Session terminated successfully'
            });
        } catch (error) {
            logger.error('Terminate session error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to terminate session'
            });
        }
    }
);

// Terminate all sessions except current
router.delete('/sessions',
    sessionRateLimiter,
    validateSession,
    async (req, res) => {
        try {
            const currentSessionId = req.headers['x-session-id'];
            await SessionManager.terminateAllUserSessions(req.session.userId, currentSessionId);
            res.json({
                status: 'success',
                message: 'All other sessions terminated successfully'
            });
        } catch (error) {
            logger.error('Terminate all sessions error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to terminate sessions'
            });
        }
    }
);

// Admin route to view all active sessions
router.get('/admin/sessions',
    sessionRateLimiter,
    validateSession,
    requireRole(['admin']),
    async (req, res) => {
        try {
            // This would need to be implemented in SessionManager
            // For example, by keeping track of all active sessions in a separate Redis set
            res.status(501).json({
                status: 'error',
                message: 'Not implemented'
            });
        } catch (error) {
            logger.error('Admin get sessions error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve sessions'
            });
        }
    }
);

export default router;
