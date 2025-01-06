import express from 'express';
import auth, { adminAuth } from '../middleware/auth.js';
import { sqlInjectionPrevention } from '../middleware/sqlInjectionPrevention.js';
import { xssPrevention } from '../middleware/xssPrevention.js';
import { fileUploadValidation } from '../middleware/fileUploadValidation.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';
import { NetworkMonitor } from '../services/NetworkMonitor.js';
import NetworkDevice from '../models/NetworkDevice.js';
import NetworkTopology from '../models/NetworkTopology.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Input validation middleware
const validateJsonInput = (req, res, next) => {
    if (req.method !== 'GET' && !req.is('application/json')) {
        return res.status(400).json({ 
          error: 'Invalid content type',
          message: 'Content-Type must be application/json'
        });
    }
    
    try {
        if (req.body && Object.keys(req.body).length > 0) {
            JSON.parse(JSON.stringify(req.body));
        }
        next();
    } catch (error) {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'Malformed JSON in request body'
        });
    }
};

// Apply security middleware to all routes
router.use(apiRateLimiter);
router.use(validateJsonInput);
router.use(sqlInjectionPrevention);
router.use(xssPrevention);

// Protected routes
router.use(auth.verifyToken);

// Network status routes
router.get('/status', async (req, res) => {
    try {
        const status = await NetworkMonitor.getNetworkStatus();
        res.json(status);
    } catch (error) {
        logger.error('Error getting network status:', error);
        res.status(500).json({ 
          error: 'Server error',
          message: 'Failed to get network status'
        });
    }
});

// Network device routes
router.get('/device/:id', async (req, res) => {
    try {
        const device = await NetworkDevice.findById(req.params.id);
        if (!device) {
            return res.status(404).json({
              error: 'Not found',
              message: 'Device not found'
            });
        }
        res.json(device);
    } catch (error) {
        logger.error('Error getting device:', error);
        res.status(500).json({
          error: 'Server error',
          message: 'Failed to get device information'
        });
    }
});

// Network topology routes
router.get('/topology', async (req, res) => {
    try {
        const topology = await NetworkTopology.find();
        res.json(topology);
    } catch (error) {
        logger.error('Error getting topology:', error);
        res.status(500).json({
          error: 'Server error',
          message: 'Failed to get network topology'
        });
    }
});

// Network metrics routes
router.get('/metrics/:id', async (req, res) => {
    try {
        const metrics = await NetworkMetrics.findById(req.params.id);
        if (!metrics) {
            return res.status(404).json({
              error: 'Not found',
              message: 'Metrics not found'
            });
        }
        res.json(metrics);
    } catch (error) {
        logger.error('Error getting metrics:', error);
        res.status(500).json({
          error: 'Server error',
          message: 'Failed to get network metrics'
        });
    }
});

// Network discovery route (admin only)
router.post('/discover', adminAuth, async (req, res) => {
    try {
        const discoveryResult = await NetworkMonitor.discoverDevices();
        res.json(discoveryResult);
    } catch (error) {
        logger.error('Error during network discovery:', error);
        res.status(500).json({
          error: 'Server error',
          message: 'Failed to perform network discovery'
        });
    }
});

// Network configuration upload (admin only)
router.post('/config/upload', adminAuth, fileUploadValidation, async (req, res) => {
    try {
        if (!req.files || !req.files.config) {
            return res.status(400).json({
              error: 'Invalid request',
              message: 'No configuration file uploaded'
            });
        }
        
        const result = await NetworkMonitor.processConfigFile(req.files.config);
        res.json(result);
    } catch (error) {
        logger.error('Error processing config file:', error);
        res.status(500).json({
          error: 'Server error',
          message: 'Failed to process configuration file'
        });
    }
});

export default router;
