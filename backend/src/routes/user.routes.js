import express from 'express';
import { validateSession, requireRole } from '../middleware/sessionAuth.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all users (admin only)
router.get('/',
    validateSession,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const users = await User.find().select('-password');
            res.json({
                status: 'success',
                data: users
            });
        } catch (error) {
            logger.error('Get users error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve users'
            });
        }
    }
);

// Update user role (admin only)
router.patch('/:userId/role',
    validateSession,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { role } = req.body;

            if (!['user', 'admin'].includes(role)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid role'
                });
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { role },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            logger.info(`Role updated for user ${user.email} to ${role}`);

            res.json({
                status: 'success',
                data: user
            });
        } catch (error) {
            logger.error('Update user role error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to update user role'
            });
        }
    }
);

// Delete user (admin only)
router.delete('/:userId',
    validateSession,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { userId } = req.params;

            const user = await User.findByIdAndDelete(userId);
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            logger.info(`User deleted: ${user.email}`);

            res.json({
                status: 'success',
                message: 'User deleted successfully'
            });
        } catch (error) {
            logger.error('Delete user error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to delete user'
            });
        }
    }
);

export default router;
