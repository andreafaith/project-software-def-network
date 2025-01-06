import express from 'express';
import { auth } from '../middleware/auth.js';
import PredictiveAnalytics from '../services/PredictiveAnalytics.js';
import logger from '../utils/logger.js';

const router = express.Router();
const predictiveAnalytics = new PredictiveAnalytics();

// Analyze trends for a device or metric
router.get('/trends/:deviceId', auth.verifyToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { metric, start, end } = req.query;
        const data = await NetworkMetrics.getMetrics(deviceId, { start, end, metric });
        const trends = await predictiveAnalytics.analyzeTrend(data);
        res.json(trends);
    } catch (error) {
        logger.error('Error analyzing trends:', error);
        res.status(500).json({ error: 'Failed to analyze trends' });
    }
});

// Detect anomalies in metrics
router.get('/anomalies/:deviceId', auth.verifyToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { metric, start, end } = req.query;
        const data = await NetworkMetrics.getMetrics(deviceId, { start, end, metric });
        const anomalies = await predictiveAnalytics.detectAnomalies(data);
        res.json(anomalies);
    } catch (error) {
        logger.error('Error detecting anomalies:', error);
        res.status(500).json({ error: 'Failed to detect anomalies' });
    }
});

// Detect patterns in metrics
router.get('/patterns/:deviceId', auth.verifyToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { metric, start, end } = req.query;
        const data = await NetworkMetrics.getMetrics(deviceId, { start, end, metric });
        const patterns = await predictiveAnalytics.detectPatterns(data);
        res.json(patterns);
    } catch (error) {
        logger.error('Error detecting patterns:', error);
        res.status(500).json({ error: 'Failed to detect patterns' });
    }
});

// Generate predictions for metrics
router.get('/forecast/:deviceId', auth.verifyToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { metric, start, end, periods } = req.query;
        const data = await NetworkMetrics.getMetrics(deviceId, { start, end, metric });
        const forecast = await predictiveAnalytics.generateForecast(data, parseInt(periods) || 24);
        res.json(forecast);
    } catch (error) {
        logger.error('Error generating forecast:', error);
        res.status(500).json({ error: 'Failed to generate forecast' });
    }
});

// Process multiple metrics for comprehensive analysis
router.post('/analyze', auth.verifyToken, async (req, res) => {
    try {
        const { metrics } = req.body;
        if (!metrics || !Array.isArray(metrics)) {
            return res.status(400).json({ error: 'Invalid metrics data' });
        }
        const analysis = await predictiveAnalytics.processMetrics(metrics);
        res.json(analysis);
    } catch (error) {
        logger.error('Error processing metrics:', error);
        res.status(500).json({ error: 'Failed to process metrics' });
    }
});

export default router;
