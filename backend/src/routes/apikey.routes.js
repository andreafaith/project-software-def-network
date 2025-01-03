import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { auth, adminAuth } from '../middleware/auth.js';
import ApiKey from '../models/ApiKey.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get user's API keys
router.get('/', 
    auth,
    async (req, res) => {
        try {
            const keys = await ApiKey.find({ 
                userId: req.user._id 
            }).select('-key');

            res.json(keys);
        } catch (error) {
            logger.error('Error fetching API keys:', error);
            res.status(500).json({ error: 'Failed to fetch API keys' });
        }
    }
);

// Create new API key
router.post('/',
    auth,
    [
        body('name').isString().trim().notEmpty(),
        body('type').isIn(['ml', 'api']),
        body('permissions').optional().isArray(),
        body('rateLimit').optional().isInt({ min: 1 }),
        body('expiresIn').optional().isString()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, type, permissions, rateLimit, expiresIn } = req.body;

            // Calculate expiry date if provided
            let expiresAt;
            if (expiresIn) {
                expiresAt = new Date();
                const unit = expiresIn.slice(-1);
                const value = parseInt(expiresIn);
                
                switch(unit) {
                    case 'd': expiresAt.setDate(expiresAt.getDate() + value); break;
                    case 'm': expiresAt.setMonth(expiresAt.getMonth() + value); break;
                    case 'y': expiresAt.setFullYear(expiresAt.getFullYear() + value); break;
                    default: throw new Error('Invalid expiry format');
                }
            }

            const key = await ApiKey.generateKey(req.user._id, type, {
                name,
                permissions,
                rateLimit,
                expiresAt,
                metadata: {
                    createdVia: 'api',
                    userEmail: req.user.email
                }
            });

            res.status(201).json({
                message: 'API key created successfully',
                key: key.key,
                id: key._id,
                expiresAt: key.expiresAt
            });
        } catch (error) {
            logger.error('Error creating API key:', error);
            res.status(500).json({ error: 'Failed to create API key' });
        }
    }
);

// Get API key details
router.get('/:id',
    auth,
    async (req, res) => {
        try {
            const key = await ApiKey.findOne({
                _id: req.params.id,
                userId: req.user._id
            }).select('-key');

            if (!key) {
                return res.status(404).json({ error: 'API key not found' });
            }

            res.json(key);
        } catch (error) {
            logger.error('Error fetching API key:', error);
            res.status(500).json({ error: 'Failed to fetch API key' });
        }
    }
);

// Update API key
router.patch('/:id',
    auth,
    [
        body('name').optional().isString().trim().notEmpty(),
        body('status').optional().isIn(['active', 'inactive']),
        body('permissions').optional().isArray(),
        body('rateLimit').optional().isInt({ min: 1 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const key = await ApiKey.findOne({
                _id: req.params.id,
                userId: req.user._id
            });

            if (!key) {
                return res.status(404).json({ error: 'API key not found' });
            }

            // Update allowed fields
            const { name, status, permissions, rateLimit } = req.body;
            if (name) key.name = name;
            if (status) key.status = status;
            if (permissions) key.permissions = permissions;
            if (rateLimit) key.rateLimit = rateLimit;

            await key.save();

            res.json({
                message: 'API key updated successfully',
                key: key.toObject({ virtuals: true, hide: ['key'] })
            });
        } catch (error) {
            logger.error('Error updating API key:', error);
            res.status(500).json({ error: 'Failed to update API key' });
        }
    }
);

// Revoke API key
router.delete('/:id',
    auth,
    async (req, res) => {
        try {
            const key = await ApiKey.findOne({
                _id: req.params.id,
                userId: req.user._id
            });

            if (!key) {
                return res.status(404).json({ error: 'API key not found' });
            }

            await key.revoke();

            res.json({ 
                message: 'API key revoked successfully',
                id: key._id
            });
        } catch (error) {
            logger.error('Error revoking API key:', error);
            res.status(500).json({ error: 'Failed to revoke API key' });
        }
    }
);

// Admin: List all API keys
router.get('/admin/all',
    adminAuth,
    async (req, res) => {
        try {
            const keys = await ApiKey.find()
                .select('-key')
                .populate('userId', 'email name');

            res.json(keys);
        } catch (error) {
            logger.error('Error fetching all API keys:', error);
            res.status(500).json({ error: 'Failed to fetch API keys' });
        }
    }
);

// Admin: Revoke any API key
router.delete('/admin/:id',
    adminAuth,
    async (req, res) => {
        try {
            const key = await ApiKey.findById(req.params.id);

            if (!key) {
                return res.status(404).json({ error: 'API key not found' });
            }

            await key.revoke();

            res.json({ 
                message: 'API key revoked successfully',
                id: key._id
            });
        } catch (error) {
            logger.error('Error revoking API key:', error);
            res.status(500).json({ error: 'Failed to revoke API key' });
        }
    }
);

export default router;
