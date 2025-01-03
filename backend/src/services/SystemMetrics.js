import os from 'os';
import v8 from 'v8';
import EventEmitter from 'events';
import logger from '../utils/logger.js';
import MetricsCollector from './MetricsCollector.js';

class SystemMetrics extends EventEmitter {
    constructor() {
        super();
        this.collector = MetricsCollector;
        this.metrics = new Map();
        this.benchmarks = new Map();
        this.thresholds = {
            cpu: 80, // 80% usage
            memory: 85, // 85% usage
            disk: 90, // 90% usage
            latency: 1000 // 1 second
        };
        
        this._initializeMonitoring();
    }

    async getRealTimeMetrics() {
        try {
            const metrics = {
                timestamp: new Date(),
                system: await this._getSystemMetrics(),
                application: await this._getApplicationMetrics(),
                performance: await this._getPerformanceMetrics()
            };

            this.metrics.set(metrics.timestamp.getTime(), metrics);
            this.emit('metricsUpdate', metrics);

            return metrics;
        } catch (error) {
            logger.error('Error getting real-time metrics:', error);
            throw error;
        }
    }

    async runBenchmark(name, options = {}) {
        try {
            const benchmark = {
                name,
                timestamp: new Date(),
                iterations: options.iterations || 1000,
                results: []
            };

            // Run warmup iterations
            if (options.warmup) {
                await this._runWarmup(options.fn, options.warmup);
            }

            // Run benchmark iterations
            for (let i = 0; i < benchmark.iterations; i++) {
                const result = await this._runBenchmarkIteration(options.fn);
                benchmark.results.push(result);
            }

            // Calculate statistics
            benchmark.statistics = this._calculateBenchmarkStatistics(
                benchmark.results
            );

            // Store benchmark results
            this.benchmarks.set(name, benchmark);

            return benchmark;
        } catch (error) {
            logger.error('Error running benchmark:', error);
            throw error;
        }
    }

    // Private helper methods
    _initializeMonitoring() {
        // Monitor system metrics
        setInterval(() => {
            this.getRealTimeMetrics().catch(error => {
                logger.error('Error collecting real-time metrics:', error);
            });
        }, 1000); // Every second

        // Check thresholds
        setInterval(() => {
            this._checkThresholds().catch(error => {
                logger.error('Error checking thresholds:', error);
            });
        }, 5000); // Every 5 seconds

        // Clean up old metrics
        setInterval(() => {
            this._cleanupOldMetrics().catch(error => {
                logger.error('Error cleaning up old metrics:', error);
            });
        }, 3600000); // Every hour
    }

    async _getSystemMetrics() {
        const cpuUsage = await this._getCpuUsage();
        const memoryUsage = this._getMemoryUsage();
        const diskUsage = await this._getDiskUsage();
        const networkUsage = await this._getNetworkUsage();

        return {
            cpu: {
                usage: cpuUsage,
                load: os.loadavg(),
                info: os.cpus()
            },
            memory: {
                ...memoryUsage,
                total: os.totalmem(),
                free: os.freemem()
            },
            disk: diskUsage,
            network: networkUsage,
            uptime: os.uptime()
        };
    }

    async _getApplicationMetrics() {
        return {
            process: {
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                uptime: process.uptime()
            },
            heap: v8.getHeapStatistics(),
            handles: {
                active: process._getActiveHandles().length,
                requests: process._getActiveRequests().length
            },
            eventLoop: this._getEventLoopMetrics()
        };
    }

    async _getPerformanceMetrics() {
        return {
            timing: this._getTimingMetrics(),
            resources: this._getResourceMetrics(),
            errors: this._getErrorMetrics()
        };
    }

    async _getCpuUsage() {
        const cpus = os.cpus();
        const usage = cpus.map(cpu => {
            const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
            return {
                user: (cpu.times.user / total) * 100,
                system: (cpu.times.sys / total) * 100,
                idle: (cpu.times.idle / total) * 100
            };
        });

        return {
            average: this._calculateAverageCpuUsage(usage),
            perCore: usage
        };
    }

    _getMemoryUsage() {
        const used = os.totalmem() - os.freemem();
        return {
            used,
            usedPercent: (used / os.totalmem()) * 100,
            process: process.memoryUsage()
        };
    }

    async _getDiskUsage() {
        // This would need to be implemented based on your specific needs
        // and the operating system you're running on
        return {};
    }

    async _getNetworkUsage() {
        const interfaces = os.networkInterfaces();
        const usage = {};

        for (const [name, nets] of Object.entries(interfaces)) {
            usage[name] = nets.map(net => ({
                address: net.address,
                netmask: net.netmask,
                family: net.family,
                mac: net.mac,
                internal: net.internal,
                cidr: net.cidr
            }));
        }

        return usage;
    }

    _getEventLoopMetrics() {
        return {
            latency: this._measureEventLoopLatency(),
            lag: this._measureEventLoopLag()
        };
    }

    _getTimingMetrics() {
        // This would need to be implemented based on your specific needs
        return {};
    }

    _getResourceMetrics() {
        return {
            heap: v8.getHeapStatistics(),
            external: process.memoryUsage().external,
            arrayBuffers: v8.getHeapSpaceStatistics().find(
                space => space.space_name === 'new_space'
            )
        };
    }

    _getErrorMetrics() {
        // This would need to be implemented based on your specific needs
        return {};
    }

    async _runWarmup(fn, iterations) {
        for (let i = 0; i < iterations; i++) {
            await fn();
        }
    }

    async _runBenchmarkIteration(fn) {
        const start = process.hrtime.bigint();
        const startMemory = process.memoryUsage();

        await fn();

        const end = process.hrtime.bigint();
        const endMemory = process.memoryUsage();

        return {
            duration: Number(end - start) / 1e6, // Convert to milliseconds
            memory: {
                heap: endMemory.heapUsed - startMemory.heapUsed,
                external: endMemory.external - startMemory.external,
                total: endMemory.rss - startMemory.rss
            }
        };
    }

    _calculateBenchmarkStatistics(results) {
        const durations = results.map(r => r.duration);
        const memories = results.map(r => r.memory.heap);

        return {
            duration: {
                min: Math.min(...durations),
                max: Math.max(...durations),
                mean: this._calculateMean(durations),
                median: this._calculateMedian(durations),
                stdDev: this._calculateStdDev(durations)
            },
            memory: {
                min: Math.min(...memories),
                max: Math.max(...memories),
                mean: this._calculateMean(memories),
                median: this._calculateMedian(memories),
                stdDev: this._calculateStdDev(memories)
            }
        };
    }

    _calculateMean(values) {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    _calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    _calculateStdDev(values) {
        const mean = this._calculateMean(values);
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        const variance = this._calculateMean(squareDiffs);
        return Math.sqrt(variance);
    }

    async _checkThresholds() {
        const metrics = await this.getRealTimeMetrics();

        // Check CPU usage
        if (metrics.system.cpu.usage.average > this.thresholds.cpu) {
            this.emit('threshold-exceeded', {
                metric: 'cpu',
                value: metrics.system.cpu.usage.average,
                threshold: this.thresholds.cpu
            });
        }

        // Check memory usage
        const memoryUsage = (metrics.system.memory.used / metrics.system.memory.total) * 100;
        if (memoryUsage > this.thresholds.memory) {
            this.emit('threshold-exceeded', {
                metric: 'memory',
                value: memoryUsage,
                threshold: this.thresholds.memory
            });
        }

        // Add more threshold checks as needed
    }

    async _cleanupOldMetrics() {
        const now = Date.now();
        const retention = 24 * 60 * 60 * 1000; // 24 hours

        for (const [timestamp] of this.metrics) {
            if (now - timestamp > retention) {
                this.metrics.delete(timestamp);
            }
        }
    }

    _measureEventLoopLatency() {
        const start = process.hrtime.bigint();
        return new Promise(resolve => {
            setImmediate(() => {
                const end = process.hrtime.bigint();
                resolve(Number(end - start) / 1e6); // Convert to milliseconds
            });
        });
    }

    _measureEventLoopLag() {
        let start = process.hrtime.bigint();
        let lag = 0;

        setInterval(() => {
            const end = process.hrtime.bigint();
            lag = Number(end - start - BigInt(1e6)) / 1e6; // Convert to milliseconds
            start = process.hrtime.bigint();
        }, 1);

        return lag;
    }
}

export default new SystemMetrics();
