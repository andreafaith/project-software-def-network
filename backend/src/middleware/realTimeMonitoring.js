import RealTimeAnalytics from '../services/RealTimeAnalytics.js';
import logger from '../utils/logger.js';

export const realTimeMonitoring = async (req, res, next) => {
    const startTime = process.hrtime();
    
    // Add response listeners
    res.on('finish', async () => {
        try {
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const duration = seconds * 1000 + nanoseconds / 1000000;

            // Collect request metrics
            const metrics = {
                path: req.path,
                method: req.method,
                statusCode: res.statusCode,
                duration,
                timestamp: new Date(),
                headers: {
                    contentLength: res.get('content-length'),
                    contentType: res.get('content-type')
                },
                client: {
                    ip: req.ip,
                    userAgent: req.get('user-agent')
                }
            };

            // Analyze traffic patterns
            const pattern = await RealTimeAnalytics.analyzeTrafficPattern(
                req.get('host'),
                metrics
            );

            // Check for anomalies
            const anomalies = await RealTimeAnalytics.detectRealTimeAnomalies(metrics);

            // If anomalies detected, log them
            if (anomalies.length > 0) {
                logger.warn('Real-time anomalies detected:', {
                    path: req.path,
                    anomalies
                });
            }

            // If pattern changes detected, trigger load balancing prediction
            if (pattern.changes.significant) {
                const loadBalancing = await RealTimeAnalytics.predictLoadBalancing([metrics]);
                
                // If load balancing actions recommended, log them
                if (loadBalancing.recommendedActions.length > 0) {
                    logger.info('Load balancing actions recommended:', loadBalancing);
                }
            }

            // Adjust thresholds if needed
            await RealTimeAnalytics.adjustThresholds(req.get('host'), metrics);

            // Check if scaling is needed
            const scaling = await RealTimeAnalytics.predictScaling({
                cpu: process.cpuUsage(),
                memory: process.memoryUsage(),
                network: metrics
            });

            // If scaling triggers generated, log them
            if (scaling.scalingTriggers.length > 0) {
                logger.info('Scaling triggers generated:', scaling);
            }

        } catch (error) {
            logger.error('Error in real-time monitoring:', error);
        }
    });

    next();
};
