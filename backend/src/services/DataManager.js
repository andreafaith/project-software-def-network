import NetworkDevice from '../models/NetworkDevice.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import AlertConfig from '../models/AlertConfig.js';
import logger from '../utils/logger.js';

class DataManager {
    // Network Device Management
    static async createDevice(deviceData) {
        try {
            const device = new NetworkDevice(deviceData);
            await device.save();
            logger.info(`Created new device: ${device.name}`);
            return device;
        } catch (error) {
            logger.error('Error creating device:', error);
            throw error;
        }
    }

    static async updateDevice(deviceId, updateData) {
        try {
            const device = await NetworkDevice.findByIdAndUpdate(
                deviceId,
                updateData,
                { new: true, runValidators: true }
            );
            if (!device) {
                throw new Error('Device not found');
            }
            logger.info(`Updated device: ${device.name}`);
            return device;
        } catch (error) {
            logger.error('Error updating device:', error);
            throw error;
        }
    }

    static async deleteDevice(deviceId) {
        try {
            const device = await NetworkDevice.findByIdAndDelete(deviceId);
            if (!device) {
                throw new Error('Device not found');
            }
            // Clean up related data
            await NetworkMetrics.deleteMany({ deviceId });
            logger.info(`Deleted device: ${device.name}`);
            return device;
        } catch (error) {
            logger.error('Error deleting device:', error);
            throw error;
        }
    }

    static async getDevices(query = {}, options = {}) {
        try {
            const devices = await NetworkDevice.find(query)
                .skip(options.skip)
                .limit(options.limit)
                .sort(options.sort);
            return devices;
        } catch (error) {
            logger.error('Error fetching devices:', error);
            throw error;
        }
    }

    // Network Metrics Management
    static async addMetrics(metricsData) {
        try {
            const metrics = new NetworkMetrics(metricsData);
            await metrics.save();
            logger.info(`Added metrics for device: ${metrics.deviceId}`);
            return metrics;
        } catch (error) {
            logger.error('Error adding metrics:', error);
            throw error;
        }
    }

    static async getMetrics(query = {}, options = {}) {
        try {
            const metrics = await NetworkMetrics.find(query)
                .skip(options.skip)
                .limit(options.limit)
                .sort(options.sort || { 'metrics.timestamp': -1 });
            return metrics;
        } catch (error) {
            logger.error('Error fetching metrics:', error);
            throw error;
        }
    }

    static async aggregateMetrics(deviceId, timeRange, aggregationType) {
        try {
            return await NetworkMetrics.aggregateMetrics(deviceId, timeRange, aggregationType);
        } catch (error) {
            logger.error('Error aggregating metrics:', error);
            throw error;
        }
    }

    // Alert Configuration Management
    static async createAlertConfig(configData) {
        try {
            const alertConfig = new AlertConfig(configData);
            await alertConfig.save();
            logger.info(`Created new alert configuration: ${alertConfig.name}`);
            return alertConfig;
        } catch (error) {
            logger.error('Error creating alert configuration:', error);
            throw error;
        }
    }

    static async updateAlertConfig(configId, updateData) {
        try {
            const alertConfig = await AlertConfig.findByIdAndUpdate(
                configId,
                updateData,
                { new: true, runValidators: true }
            );
            if (!alertConfig) {
                throw new Error('Alert configuration not found');
            }
            logger.info(`Updated alert configuration: ${alertConfig.name}`);
            return alertConfig;
        } catch (error) {
            logger.error('Error updating alert configuration:', error);
            throw error;
        }
    }

    static async deleteAlertConfig(configId) {
        try {
            const alertConfig = await AlertConfig.findByIdAndDelete(configId);
            if (!alertConfig) {
                throw new Error('Alert configuration not found');
            }
            logger.info(`Deleted alert configuration: ${alertConfig.name}`);
            return alertConfig;
        } catch (error) {
            logger.error('Error deleting alert configuration:', error);
            throw error;
        }
    }

    static async getAlertConfigs(query = {}, options = {}) {
        try {
            const alertConfigs = await AlertConfig.find(query)
                .skip(options.skip)
                .limit(options.limit)
                .sort(options.sort);
            return alertConfigs;
        } catch (error) {
            logger.error('Error fetching alert configurations:', error);
            throw error;
        }
    }

    // Data Cleanup and Maintenance
    static async cleanupOldMetrics(retentionDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const result = await NetworkMetrics.deleteMany({
                'metrics.timestamp': { $lt: cutoffDate }
            });

            logger.info(`Cleaned up ${result.deletedCount} old metrics records`);
            return result;
        } catch (error) {
            logger.error('Error cleaning up old metrics:', error);
            throw error;
        }
    }

    // Bulk Operations
    static async bulkUpdateDevices(updates) {
        try {
            const bulkOps = updates.map(update => ({
                updateOne: {
                    filter: { _id: update._id },
                    update: { $set: update.data },
                    upsert: false
                }
            }));

            const result = await NetworkDevice.bulkWrite(bulkOps);
            logger.info(`Bulk updated ${result.modifiedCount} devices`);
            return result;
        } catch (error) {
            logger.error('Error performing bulk device update:', error);
            throw error;
        }
    }

    // Data Export
    static async exportDeviceData(query = {}) {
        try {
            const devices = await NetworkDevice.find(query)
                .select('-__v')
                .lean();

            const metrics = await NetworkMetrics.find({ 
                deviceId: { $in: devices.map(d => d._id) }
            }).lean();

            return {
                devices,
                metrics,
                exportDate: new Date(),
                totalDevices: devices.length,
                totalMetrics: metrics.length
            };
        } catch (error) {
            logger.error('Error exporting device data:', error);
            throw error;
        }
    }
}

export default DataManager;
