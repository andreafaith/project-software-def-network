import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Google OAuth routes
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
        try {
            const token = generateToken(req.user);
            // Redirect to frontend with token
            res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}`);
        } catch (error) {
            logger.error('Google callback error:', error);
            res.redirect(`${process.env.FRONTEND_URL}/oauth/error`);
        }
    }
);

// GitHub OAuth routes
router.get('/github',
    passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
    passport.authenticate('github', { session: false }),
    (req, res) => {
        try {
            const token = generateToken(req.user);
            // Redirect to frontend with token
            res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}`);
        } catch (error) {
            logger.error('GitHub callback error:', error);
            res.redirect(`${process.env.FRONTEND_URL}/oauth/error`);
        }
    }
);

// Verify OAuth token
router.get('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, message: 'Invalid token' });
    }
});

export default router;
