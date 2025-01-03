import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import mlRoutes from './ml.routes.js';
import networkRoutes from './network.routes.js';
import oauthRoutes from './oauth.routes.js';
import dataRoutes from './data.routes.js';
import analyticsRoutes from './analytics.routes.js';
import apikeyRoutes from './apikey.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ml', mlRoutes);
router.use('/network', networkRoutes);
router.use('/oauth', oauthRoutes);
router.use('/data', dataRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/apikeys', apikeyRoutes);

export default router;
