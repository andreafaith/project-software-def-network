import os from 'os';
import v8 from 'v8';
import process from 'process';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

class MetricsCollector extends EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.collectionInterval = 10000; // 10 seconds
        this.retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.benchmarks = new Map();
        
        this._initializeCollection();
    }

    async collectSystemMetrics() {
        try {
            const metrics = {
                timestamp: new Date(),
                system: {
                    cpu: await this._getCpuMetrics(),
                    memory: this._getMemoryMetrics(),
                    network: await this._getNetworkMetrics(),
                    disk: await this._getDiskMetrics(),
                    os: this._getOsMetrics()
                },
                process: {
                    memory: this._getProcessMemoryMetrics(),
                    cpu: this._getProcessCpuMetrics(),
                    handles: this._getHandleMetrics(),
                    gc: this._getGCMetrics()
                },
                application: {
                    connections: await this._getConnectionMetrics(),
                    requests: this._getRequestMetrics(),
                    errors: this._getErrorMetrics(),
                    latency: this._getLatencyMetrics()
                }
            };

            await this._storeMetrics(metrics);
            this.emit('metricsCollected', metrics);
            return metrics;
        } catch (error) {
            logger.error('Error collecting system metrics:', error);
            throw error;
        }
    }

    async createBackup() {
        try {
            const timestamp = new Date().toISOString();
            const backupPath = `./backups/metrics_${timestamp}.json`;

            // Get all metrics
            const metrics = await this._getAllMetrics();

            // Create backup directory if it doesn't exist
            await fs.promises.mkdir('./backups', { recursive: true });

            // Write backup file
            await fs.promises.writeFile(
                backupPath,
                JSON.stringify(metrics, null, 2)
            );

            logger.info(`Backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            logger.error('Error creating backup:', error);
            throw error;
        }
    }

    async runBenchmark(name, options = {}) {
        try {
            const startTime = process.hrtime();
            const startMemory = process.memoryUsage();

            // Run the benchmark function
            if (options.fn) {
                await options.fn();
            }

            const endTime = process.hrtime(startTime);
            const endMemory = process.memoryUsage();

            // Calculate metrics
            const results = {
                name,
                timestamp: new Date(),
                duration: endTime[0] * 1e9 + endTime[1], // nanoseconds
                memory: {
                    heap: endMemory.heapUsed - startMemory.heapUsed,
                    external: endMemory.external - startMemory.external,
                    total: endMemory.rss - startMemory.rss
                }
            };

            // Store benchmark results
            this.benchmarks.set(name, results);
            
            return results;
        } catch (error) {
            logger.error('Error running benchmark:', error);
            throw error;
        }
    }

    // Private helper methods
    _initializeCollection() {
        setInterval(() => {
            this.collectSystemMetrics().catch(error => {
                logger.error('Error in metrics collection interval:', error);
            });
        }, this.collectionInterval);

        // Clean up old metrics periodically
        setInterval(() => {
            this._cleanupOldMetrics().catch(error => {
                logger.error('Error cleaning up old metrics:', error);
            });
        }, this.collectionInterval * 10);
    }

    async _getCpuMetrics() {
        const cpus = os.cpus();
        const loadAvg = os.loadavg();

        return {
            count: cpus.length,
            model: cpus[0].model,
            speed: cpus[0].speed,
            load: {
                '1m': loadAvg[0],
                '5m': loadAvg[1],
                '15m': loadAvg[2]
            },
            usage: this._calculateCpuUsage(cpus)
        };
    }

    _getMemoryMetrics() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;

        return {
            total,
            free,
            used,
            usagePercent: (used / total) * 100
        };
    }

    async _getNetworkMetrics() {
        const networkInterfaces = os.networkInterfaces();
        const metrics = {};

        for (const [name, interfaces] of Object.entries(networkInterfaces)) {
            metrics[name] = interfaces.map(iface => ({
                address: iface.address,
                netmask: iface.netmask,
                family: iface.family,
                mac: iface.mac,
                internal: iface.internal
            }));
        }

        return metrics;
    }

    async _getDiskMetrics() {
        // This would need to be implemented based on your specific needs
        // and the operating system you're running on
        return {};
    }

    _getOsMetrics() {
        return {
            platform: os.platform(),
            release: os.release(),
            type: os.type(),
            arch: os.arch(),
            uptime: os.uptime()
        };
    }

    _getProcessMemoryMetrics() {
        const memory = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();

        return {
            rss: memory.rss,
            heapTotal: memory.heapTotal,
            heapUsed: memory.heapUsed,
            external: memory.external,
            heapSizeLimit: heapStats.heap_size_limit,
            totalAvailable: heapStats.total_available_size
        };
    }

    _getProcessCpuMetrics() {
        const usage = process.cpuUsage();
        return {
            user: usage.user,
            system: usage.system
        };
    }

    _getHandleMetrics() {
        return {
            active: process._getActiveHandles().length,
            requests: process._getActiveRequests().length
        };
    }

    _getGCMetrics() {
        const metrics = v8.getHeapStatistics();
        return {
            totalHeapSize: metrics.total_heap_size,
            totalHeapSizeExecutable: metrics.total_heap_size_executable,
            totalPhysicalSize: metrics.total_physical_size,
            totalAvailableSize: metrics.total_available_size,
            usedHeapSize: metrics.used_heap_size
        };
    }

    async _getConnectionMetrics() {
        return {
            mongodb: mongoose.connection.readyState,
            // Add other connection metrics as needed
        };
    }

    _getRequestMetrics() {
        // This would need to be implemented based on your specific needs
        return {};
    }

    _getErrorMetrics() {
        // This would need to be implemented based on your specific needs
        return {};
    }

    _getLatencyMetrics() {
        // This would need to be implemented based on your specific needs
        return {};
    }

    async _storeMetrics(metrics) {
        const key = `metrics:${metrics.timestamp.toISOString()}`;
        this.metrics.set(key, metrics);
    }

    async _cleanupOldMetrics() {
        const cutoff = Date.now() - this.retentionPeriod;
        
        for (const [key, metric] of this.metrics.entries()) {
            if (metric.timestamp.getTime() < cutoff) {
                this.metrics.delete(key);
            }
        }
    }

    _calculateCpuUsage(cpus) {
        return cpus.map(cpu => {
            const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
            return {
                user: (cpu.times.user / total) * 100,
                system: (cpu.times.sys / total) * 100,
                idle: (cpu.times.idle / total) * 100
            };
        });
    }
}

export default new MetricsCollector();
