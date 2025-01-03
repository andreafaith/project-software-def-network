import express from 'express';
import { auth, adminAuth } from '../middleware/auth.js';
import DataManager from '../services/DataManager.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Network Device Routes
router.post('/devices', adminAuth, async (req, res) => {
    try {
        const device = await DataManager.createDevice(req.body);
        res.status(201).json(device);
    } catch (error) {
        logger.error('Create device error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/devices', auth, async (req, res) => {
    try {
        const { skip, limit, sort, ...query } = req.query;
        const devices = await DataManager.getDevices(query, {
            skip: parseInt(skip),
            limit: parseInt(limit),
            sort
        });
        res.json(devices);
    } catch (error) {
        logger.error('Get devices error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/devices/:id', adminAuth, async (req, res) => {
    try {
        const device = await DataManager.updateDevice(req.params.id, req.body);
        res.json(device);
    } catch (error) {
        logger.error('Update device error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.delete('/devices/:id', adminAuth, async (req, res) => {
    try {
        await DataManager.deleteDevice(req.params.id);
        res.status(204).send();
    } catch (error) {
        logger.error('Delete device error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Network Metrics Routes
router.post('/metrics', auth, async (req, res) => {
    try {
        const metrics = await DataManager.addMetrics(req.body);
        res.status(201).json(metrics);
    } catch (error) {
        logger.error('Add metrics error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/metrics', auth, async (req, res) => {
    try {
        const { skip, limit, sort, startTime, endTime, deviceId } = req.query;
        const query = {};
        
        if (deviceId) query.deviceId = deviceId;
        if (startTime || endTime) {
            query['metrics.timestamp'] = {};
            if (startTime) query['metrics.timestamp'].$gte = new Date(startTime);
            if (endTime) query['metrics.timestamp'].$lte = new Date(endTime);
        }

        const metrics = await DataManager.getMetrics(query, {
            skip: parseInt(skip),
            limit: parseInt(limit),
            sort
        });
        res.json(metrics);
    } catch (error) {
        logger.error('Get metrics error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/metrics/aggregate/:deviceId', auth, async (req, res) => {
    try {
        const { startTime, endTime, aggregationType } = req.query;
        const aggregatedMetrics = await DataManager.aggregateMetrics(
            req.params.deviceId,
            { start: new Date(startTime), end: new Date(endTime) },
            aggregationType
        );
        res.json(aggregatedMetrics);
    } catch (error) {
        logger.error('Aggregate metrics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Alert Configuration Routes
router.post('/alerts/config', adminAuth, async (req, res) => {
    try {
        const alertConfig = await DataManager.createAlertConfig(req.body);
        res.status(201).json(alertConfig);
    } catch (error) {
        logger.error('Create alert config error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/alerts/config', auth, async (req, res) => {
    try {
        const { skip, limit, sort, ...query } = req.query;
        const alertConfigs = await DataManager.getAlertConfigs(query, {
            skip: parseInt(skip),
            limit: parseInt(limit),
            sort
        });
        res.json(alertConfigs);
    } catch (error) {
        logger.error('Get alert configs error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/alerts/config/:id', adminAuth, async (req, res) => {
    try {
        const alertConfig = await DataManager.updateAlertConfig(req.params.id, req.body);
        res.json(alertConfig);
    } catch (error) {
        logger.error('Update alert config error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.delete('/alerts/config/:id', adminAuth, async (req, res) => {
    try {
        await DataManager.deleteAlertConfig(req.params.id);
        res.status(204).send();
    } catch (error) {
        logger.error('Delete alert config error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Data Maintenance Routes
router.post('/maintenance/cleanup', adminAuth, async (req, res) => {
    try {
        const { retentionDays } = req.body;
        const result = await DataManager.cleanupOldMetrics(retentionDays);
        res.json(result);
    } catch (error) {
        logger.error('Data cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk Operations
router.post('/devices/bulk', adminAuth, async (req, res) => {
    try {
        const result = await DataManager.bulkUpdateDevices(req.body);
        res.json(result);
    } catch (error) {
        logger.error('Bulk update error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Data Export
router.get('/export', adminAuth, async (req, res) => {
    try {
        const data = await DataManager.exportDeviceData(req.query);
        res.json(data);
    } catch (error) {
        logger.error('Data export error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
