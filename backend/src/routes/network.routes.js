import express from 'express';
import { auth, adminAuth } from '../middleware/auth.js';
import NetworkMonitor from '../services/NetworkMonitor.js';
import NetworkDevice from '../models/NetworkDevice.js';
import NetworkTopology from '../models/NetworkTopology.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Device Discovery
router.post('/discover', adminAuth, async (req, res) => {
    try {
        const { subnet } = req.body;
        const devices = await NetworkMonitor.discoverDevices(subnet);
        res.json(devices);
    } catch (error) {
        logger.error('Device discovery error:', error);
        res.status(500).json({ error: 'Device discovery failed' });
    }
});

// Get all devices
router.get('/devices', auth, async (req, res) => {
    try {
        const devices = await NetworkDevice.find();
        res.json(devices);
    } catch (error) {
        logger.error('Get devices error:', error);
        res.status(500).json({ error: 'Failed to retrieve devices' });
    }
});

// Topology Mapping
router.post('/topology/map', adminAuth, async (req, res) => {
    try {
        const topology = await NetworkMonitor.mapTopology();
        res.json(topology);
    } catch (error) {
        logger.error('Topology mapping error:', error);
        res.status(500).json({ error: 'Topology mapping failed' });
    }
});

// Get current topology
router.get('/topology', auth, async (req, res) => {
    try {
        const topology = await NetworkTopology.findOne()
            .sort({ createdAt: -1 })
            .populate('connections.sourceDevice')
            .populate('connections.targetDevice');
        res.json(topology);
    } catch (error) {
        logger.error('Get topology error:', error);
        res.status(500).json({ error: 'Failed to retrieve topology' });
    }
});

// Bandwidth Monitoring
router.post('/metrics/bandwidth/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { interfaceName } = req.body;
        const metrics = await NetworkMonitor.monitorBandwidth(deviceId, interfaceName);
        res.json(metrics);
    } catch (error) {
        logger.error('Bandwidth monitoring error:', error);
        res.status(500).json({ error: 'Bandwidth monitoring failed' });
    }
});

// Get device metrics
router.get('/metrics/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { startTime, endTime } = req.query;
        
        const metrics = await NetworkMetrics.find({
            deviceId,
            'metrics.timestamp': {
                $gte: new Date(startTime),
                $lte: new Date(endTime)
            }
        }).sort({ 'metrics.timestamp': 1 });
        
        res.json(metrics);
    } catch (error) {
        logger.error('Get metrics error:', error);
        res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
});

// Health Check
router.get('/health/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const health = await NetworkMonitor.checkDeviceHealth(deviceId);
        res.json(health);
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({ error: 'Health check failed' });
    }
});

// Device Status
router.get('/status/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const status = await NetworkMonitor.trackDeviceStatus(deviceId);
        res.json({ status });
    } catch (error) {
        logger.error('Status check error:', error);
        res.status(500).json({ error: 'Status check failed' });
    }
});

// Bulk Health Check
router.post('/health/bulk', auth, async (req, res) => {
    try {
        const { deviceIds } = req.body;
        const healthResults = await Promise.all(
            deviceIds.map(id => NetworkMonitor.checkDeviceHealth(id))
        );
        res.json(healthResults);
    } catch (error) {
        logger.error('Bulk health check error:', error);
        res.status(500).json({ error: 'Bulk health check failed' });
    }
});

// Generate Alert
router.post('/alert', auth, async (req, res) => {
    try {
        const { deviceId, type, severity, message } = req.body;
        const alert = await NetworkMonitor.generateAlert(deviceId, type, severity, message);
        res.json(alert);
    } catch (error) {
        logger.error('Alert generation error:', error);
        res.status(500).json({ error: 'Alert generation failed' });
    }
});

export default router;
