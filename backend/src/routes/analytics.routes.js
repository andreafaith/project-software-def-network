import express from 'express';
import { auth, adminAuth } from '../middleware/auth.js';
import Analytics from '../services/Analytics.js';
import DataRetention from '../services/DataRetention.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Device Statistics
router.get('/devices/stats', auth, async (req, res) => {
    try {
        const stats = await Analytics.getDeviceStatistics();
        res.json(stats);
    } catch (error) {
        logger.error('Get device statistics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Performance Metrics
router.get('/performance', auth, async (req, res) => {
    try {
        const { start, end } = req.query;
        const metrics = await Analytics.getPerformanceMetrics({ start, end });
        res.json(metrics);
    } catch (error) {
        logger.error('Get performance metrics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Alert Statistics
router.get('/alerts/stats', auth, async (req, res) => {
    try {
        const { start, end } = req.query;
        const stats = await Analytics.getAlertStatistics({ start, end });
        res.json(stats);
    } catch (error) {
        logger.error('Get alert statistics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Trend Analysis
router.get('/trends/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { metric, start, end, interval } = req.query;
        const trends = await Analytics.analyzeTrends(deviceId, metric, { start, end }, interval);
        res.json(trends);
    } catch (error) {
        logger.error('Analyze trends error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Capacity Planning
router.get('/capacity', auth, async (req, res) => {
    try {
        const { start, end, projectionDays } = req.query;
        const analysis = await Analytics.analyzeCapacity(
            { start, end },
            parseInt(projectionDays)
        );
        res.json(analysis);
    } catch (error) {
        logger.error('Analyze capacity error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Data Retention
router.post('/retention/apply', adminAuth, async (req, res) => {
    try {
        const results = await DataRetention.applyRetentionPolicies();
        res.json(results);
    } catch (error) {
        logger.error('Apply retention policies error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/retention/status', adminAuth, async (req, res) => {
    try {
        const status = await DataRetention.getRetentionStatus();
        res.json(status);
    } catch (error) {
        logger.error('Get retention status error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
