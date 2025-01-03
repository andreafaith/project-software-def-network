import NetworkDevice from '../models/NetworkDevice.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import AutoConfigService from './AutoConfigService.js';
import logger from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class SelfHealingService {
    /**
     * Detect faults in the network
     * @param {string} deviceId - Device ID to check
     */
    static async detectFaults(deviceId) {
        try {
            const device = await NetworkDevice.findById(deviceId);
            if (!device) {
                throw new Error('Device not found');
            }

            const faults = [];

            // Check connectivity
            const connectivityStatus = await this._checkConnectivity(device);
            if (!connectivityStatus.isConnected) {
                faults.push({
                    type: 'connectivity',
                    severity: 'high',
                    description: connectivityStatus.error
                });
            }

            // Check performance metrics
            const performanceIssues = await this._checkPerformance(device);
            faults.push(...performanceIssues);

            // Check configuration state
            const configIssues = await this._checkConfiguration(device);
            faults.push(...configIssues);

            return faults;
        } catch (error) {
            logger.error('Fault detection error:', error);
            throw error;
        }
    }

    /**
     * Attempt to recover from detected faults
     * @param {string} deviceId - Device ID
     * @param {Array} faults - Detected faults
     */
    static async attemptRecovery(deviceId, faults) {
        try {
            const device = await NetworkDevice.findById(deviceId);
            if (!device) {
                throw new Error('Device not found');
            }

            const recoveryResults = [];

            for (const fault of faults) {
                const result = await this._handleFault(device, fault);
                recoveryResults.push(result);
            }

            return recoveryResults;
        } catch (error) {
            logger.error('Recovery attempt error:', error);
            throw error;
        }
    }

    /**
     * Restore service after a fault
     * @param {string} deviceId - Device ID
     */
    static async restoreService(deviceId) {
        try {
            const device = await NetworkDevice.findById(deviceId);
            if (!device) {
                throw new Error('Device not found');
            }

            // Attempt service restoration steps
            const steps = [
                this._restoreConfiguration,
                this._restartServices,
                this._verifyOperation
            ];

            const results = [];
            for (const step of steps) {
                try {
                    const result = await step(device);
                    results.push(result);
                } catch (stepError) {
                    logger.error(`Service restoration step failed:`, stepError);
                    results.push({
                        success: false,
                        error: stepError.message
                    });
                }
            }

            return results;
        } catch (error) {
            logger.error('Service restoration error:', error);
            throw error;
        }
    }

    /**
     * Run automated health checks
     * @param {string} deviceId - Device ID
     */
    static async runHealthCheck(deviceId) {
        try {
            const device = await NetworkDevice.findById(deviceId);
            if (!device) {
                throw new Error('Device not found');
            }

            const healthStatus = {
                connectivity: await this._checkConnectivity(device),
                performance: await this._checkPerformance(device),
                configuration: await this._checkConfiguration(device),
                services: await this._checkServices(device)
            };

            // Update device health status
            device.healthStatus = healthStatus;
            device.lastHealthCheck = new Date();
            await device.save();

            return healthStatus;
        } catch (error) {
            logger.error('Health check error:', error);
            throw error;
        }
    }

    /**
     * Check device connectivity
     * @private
     */
    static async _checkConnectivity(device) {
        try {
            const { stdout } = await execAsync(`ping -n 1 ${device.ipAddress}`);
            return {
                isConnected: !stdout.includes('Request timed out'),
                latency: this._extractPingLatency(stdout)
            };
        } catch (error) {
            return {
                isConnected: false,
                error: error.message
            };
        }
    }

    /**
     * Check device performance
     * @private
     */
    static async _checkPerformance(device) {
        const issues = [];
        const metrics = await NetworkMetrics.findOne({ 
            deviceId: device._id 
        }).sort({ timestamp: -1 });

        if (metrics) {
            // CPU Usage Check
            if (metrics.cpu && metrics.cpu.usage > 80) {
                issues.push({
                    type: 'performance',
                    subType: 'cpu',
                    severity: 'medium',
                    description: `High CPU usage: ${metrics.cpu.usage}%`
                });
            }

            // Memory Usage Check
            if (metrics.memory && (metrics.memory.used / metrics.memory.total) > 0.9) {
                issues.push({
                    type: 'performance',
                    subType: 'memory',
                    severity: 'medium',
                    description: 'High memory usage'
                });
            }

            // Interface Check
            if (metrics.interfaces) {
                for (const [name, data] of Object.entries(metrics.interfaces)) {
                    if (data.errors > 100 || data.discards > 100) {
                        issues.push({
                            type: 'performance',
                            subType: 'interface',
                            severity: 'medium',
                            description: `Interface ${name} showing high errors/discards`
                        });
                    }
                }
            }
        }

        return issues;
    }

    /**
     * Check device configuration
     * @private
     */
    static async _checkConfiguration(device) {
        const issues = [];

        try {
            // Get current config
            const currentConfig = await AutoConfigService._getDeviceConfig(device);
            
            // Validate current configuration
            try {
                AutoConfigService.validateConfig(currentConfig, device.type);
            } catch (validationError) {
                issues.push({
                    type: 'configuration',
                    severity: 'high',
                    description: `Configuration validation failed: ${validationError.message}`
                });
            }

            // Check for configuration drift
            const lastBackup = await this._getLastConfigBackup(device);
            if (lastBackup && JSON.stringify(currentConfig) !== JSON.stringify(lastBackup)) {
                issues.push({
                    type: 'configuration',
                    severity: 'medium',
                    description: 'Configuration drift detected'
                });
            }
        } catch (error) {
            issues.push({
                type: 'configuration',
                severity: 'high',
                description: `Configuration check failed: ${error.message}`
            });
        }

        return issues;
    }

    /**
     * Handle specific fault
     * @private
     */
    static async _handleFault(device, fault) {
        const result = {
            fault,
            success: false,
            actions: []
        };

        try {
            switch (fault.type) {
                case 'connectivity':
                    result.actions.push(await this._handleConnectivityIssue(device));
                    break;
                case 'performance':
                    result.actions.push(await this._handlePerformanceIssue(device, fault));
                    break;
                case 'configuration':
                    result.actions.push(await this._handleConfigurationIssue(device));
                    break;
                default:
                    throw new Error(`Unknown fault type: ${fault.type}`);
            }

            result.success = result.actions.every(action => action.success);
        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    /**
     * Handle connectivity issues
     * @private
     */
    static async _handleConnectivityIssue(device) {
        // Implement interface reset, routing table refresh, etc.
        logger.info(`Handling connectivity issue for device: ${device.name}`);
        return { success: true, action: 'connectivity_recovery' };
    }

    /**
     * Handle performance issues
     * @private
     */
    static async _handlePerformanceIssue(device, fault) {
        // Implement performance optimization, resource reallocation, etc.
        logger.info(`Handling performance issue for device: ${device.name}`);
        return { success: true, action: 'performance_optimization' };
    }

    /**
     * Handle configuration issues
     * @private
     */
    static async _handleConfigurationIssue(device) {
        try {
            // Get last known good configuration
            const lastGoodConfig = await this._getLastConfigBackup(device);
            if (!lastGoodConfig) {
                throw new Error('No configuration backup available');
            }

            // Restore configuration
            await AutoConfigService.deployConfig(device._id, lastGoodConfig);
            return { success: true, action: 'config_restore' };
        } catch (error) {
            logger.error('Configuration restoration failed:', error);
            return { success: false, action: 'config_restore', error: error.message };
        }
    }

    /**
     * Extract ping latency from output
     * @private
     */
    static _extractPingLatency(pingOutput) {
        const match = pingOutput.match(/time[=<](\d+)ms/);
        return match ? parseInt(match[1]) : null;
    }
}

export default SelfHealingService;
