import logger from './logger.js';

class SLAMonitor {
    constructor(options = {}) {
        this.thresholds = {
            responseTime: options.responseTime || 500, // ms
            availability: options.availability || 99.9, // percentage
            errorRate: options.errorRate || 0.1, // percentage
            ...options.thresholds
        };

        this.window = {
            size: options.windowSize || 3600000, // 1 hour in ms
            buckets: options.windowBuckets || 60 // 1-minute buckets
        };

        this.metrics = new Map();
        this.violations = new Map();
        
        // Initialize metrics storage
        this._initializeMetrics();
    }

    trackRequest(endpoint, duration, status) {
        const timestamp = Date.now();
        const bucket = this._getBucket(timestamp);
        
        const metrics = this.metrics.get(endpoint) || this._createEndpointMetrics();
        const bucketData = metrics.buckets.get(bucket) || this._createBucketData();

        // Update metrics
        bucketData.totalRequests++;
        bucketData.totalDuration += duration;
        
        if (status >= 500) {
            bucketData.errors++;
        }

        metrics.buckets.set(bucket, bucketData);
        this.metrics.set(endpoint, metrics);

        // Check SLA violations
        this._checkViolations(endpoint, duration, status);
    }

    getSLAMetrics(endpoint) {
        const metrics = this.metrics.get(endpoint);
        if (!metrics) return null;

        const now = Date.now();
        const windowStart = now - this.window.size;

        let totalRequests = 0;
        let totalDuration = 0;
        let totalErrors = 0;

        // Aggregate metrics within window
        metrics.buckets.forEach((data, bucket) => {
            if (bucket >= windowStart) {
                totalRequests += data.totalRequests;
                totalDuration += data.totalDuration;
                totalErrors += data.errors;
            }
        });

        // Calculate SLA metrics
        const availability = totalRequests ? 
            ((totalRequests - totalErrors) / totalRequests) * 100 : 100;
        
        const avgResponseTime = totalRequests ? 
            totalDuration / totalRequests : 0;
        
        const errorRate = totalRequests ? 
            (totalErrors / totalRequests) * 100 : 0;

        return {
            endpoint,
            window: {
                start: new Date(windowStart).toISOString(),
                end: new Date(now).toISOString()
            },
            metrics: {
                totalRequests,
                availability: Number(availability.toFixed(2)),
                avgResponseTime: Number(avgResponseTime.toFixed(2)),
                errorRate: Number(errorRate.toFixed(2))
            },
            thresholds: this.thresholds,
            violations: this.violations.get(endpoint) || []
        };
    }

    _checkViolations(endpoint, duration, status) {
        const violations = [];

        // Check response time violation
        if (duration > this.thresholds.responseTime) {
            violations.push({
                type: 'RESPONSE_TIME',
                value: duration,
                threshold: this.thresholds.responseTime,
                timestamp: new Date().toISOString()
            });
        }

        // Check error rate and availability
        const metrics = this.getSLAMetrics(endpoint);
        if (metrics) {
            if (metrics.metrics.errorRate > this.thresholds.errorRate) {
                violations.push({
                    type: 'ERROR_RATE',
                    value: metrics.metrics.errorRate,
                    threshold: this.thresholds.errorRate,
                    timestamp: new Date().toISOString()
                });
            }

            if (metrics.metrics.availability < this.thresholds.availability) {
                violations.push({
                    type: 'AVAILABILITY',
                    value: metrics.metrics.availability,
                    threshold: this.thresholds.availability,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Record violations
        if (violations.length > 0) {
            const endpointViolations = this.violations.get(endpoint) || [];
            this.violations.set(endpoint, [...endpointViolations, ...violations]);

            // Log violations
            violations.forEach(violation => {
                logger.warn('SLA Violation detected', {
                    endpoint,
                    violation
                });
            });
        }
    }

    _getBucket(timestamp) {
        return timestamp - (timestamp % (this.window.size / this.window.buckets));
    }

    _createEndpointMetrics() {
        return {
            buckets: new Map()
        };
    }

    _createBucketData() {
        return {
            totalRequests: 0,
            totalDuration: 0,
            errors: 0
        };
    }

    _initializeMetrics() {
        setInterval(() => {
            const now = Date.now();
            const windowStart = now - this.window.size;

            // Clean up old metrics
            this.metrics.forEach((metrics, endpoint) => {
                metrics.buckets.forEach((_, bucket) => {
                    if (bucket < windowStart) {
                        metrics.buckets.delete(bucket);
                    }
                });
            });

            // Clean up old violations
            this.violations.forEach((violations, endpoint) => {
                this.violations.set(
                    endpoint,
                    violations.filter(v => new Date(v.timestamp) > windowStart)
                );
            });
        }, this.window.size / this.window.buckets);
    }
}

// Example usage:
/*
const slaMonitor = new SLAMonitor({
    responseTime: 500,
    availability: 99.9,
    errorRate: 0.1,
    windowSize: 3600000,
    windowBuckets: 60
});

// Track requests
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        slaMonitor.trackRequest(req.path, duration, res.statusCode);
    });
    next();
});

// Get metrics
app.get('/metrics', (req, res) => {
    const metrics = slaMonitor.getSLAMetrics('/api/data');
    res.json(metrics);
});
*/

export default SLAMonitor;
