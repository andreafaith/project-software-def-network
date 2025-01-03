import dns from 'dns';
import { promisify } from 'util';
import logger from './logger.js';

const dnsResolve = promisify(dns.resolve);
const dnsResolvePtr = promisify(dns.resolvePtr);

class ServiceDiscovery {
    constructor(options = {}) {
        this.services = new Map();
        this.healthChecks = new Map();
        this.updateInterval = options.updateInterval || 30000;
        this.healthCheckInterval = options.healthCheckInterval || 10000;
        this.retries = options.retries || 3;

        // Start service monitoring
        this._startMonitoring();
    }

    async registerService(name, details) {
        try {
            const service = {
                name,
                instances: [],
                lastUpdate: new Date(),
                status: 'initializing',
                ...details
            };

            // Validate service details
            this._validateServiceDetails(details);

            // Register service
            this.services.set(name, service);
            
            // Set up health check
            if (details.healthCheck) {
                this.healthChecks.set(name, details.healthCheck);
            }

            // Initial service discovery
            await this._discoverInstances(name);

            logger.info('Service registered successfully', { name, details });
            return true;

        } catch (error) {
            logger.error('Error registering service:', error);
            throw error;
        }
    }

    async getService(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not found`);
        }

        // Get healthy instances
        const healthyInstances = service.instances.filter(
            instance => instance.status === 'healthy'
        );

        if (healthyInstances.length === 0) {
            throw new Error(`No healthy instances found for service '${name}'`);
        }

        // Simple round-robin load balancing
        const instance = healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
        
        return {
            ...instance,
            serviceName: name,
            timestamp: new Date()
        };
    }

    async getAllServices() {
        const services = [];
        for (const [name, service] of this.services) {
            services.push({
                name,
                instances: service.instances.length,
                healthyInstances: service.instances.filter(i => i.status === 'healthy').length,
                lastUpdate: service.lastUpdate,
                status: service.status
            });
        }
        return services;
    }

    async _discoverInstances(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) return;

        try {
            let instances = [];

            // DNS-based discovery
            if (service.discoveryType === 'dns') {
                instances = await this._dnsDiscovery(service.domain);
            }
            // Static configuration
            else if (service.discoveryType === 'static') {
                instances = service.instances;
            }
            // Environment variables
            else if (service.discoveryType === 'env') {
                instances = this._envDiscovery(service.envPrefix);
            }

            // Update service instances
            service.instances = instances;
            service.lastUpdate = new Date();
            service.status = 'active';

            this.services.set(serviceName, service);

        } catch (error) {
            logger.error('Error discovering service instances:', {
                service: serviceName,
                error: error.message
            });
            
            service.status = 'error';
            this.services.set(serviceName, service);
        }
    }

    async _dnsDiscovery(domain) {
        try {
            const addresses = await dnsResolve(domain, 'A');
            return addresses.map(ip => ({
                host: ip,
                status: 'unknown',
                lastCheck: null
            }));
        } catch (error) {
            logger.error('DNS discovery error:', error);
            throw error;
        }
    }

    _envDiscovery(prefix) {
        const instances = [];
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith(prefix)) {
                instances.push({
                    host: value,
                    status: 'unknown',
                    lastCheck: null
                });
            }
        }
        return instances;
    }

    async _checkHealth(serviceName) {
        const service = this.services.get(serviceName);
        const healthCheck = this.healthChecks.get(serviceName);

        if (!service || !healthCheck) return;

        for (const instance of service.instances) {
            try {
                const isHealthy = await healthCheck(instance);
                instance.status = isHealthy ? 'healthy' : 'unhealthy';
                instance.lastCheck = new Date();
            } catch (error) {
                instance.status = 'unhealthy';
                instance.lastCheck = new Date();
                instance.error = error.message;

                logger.warn('Health check failed:', {
                    service: serviceName,
                    instance: instance.host,
                    error: error.message
                });
            }
        }

        // Update service status
        service.lastUpdate = new Date();
        this.services.set(serviceName, service);
    }

    _startMonitoring() {
        // Regular service discovery updates
        setInterval(() => {
            this.services.forEach((_, name) => {
                this._discoverInstances(name).catch(error => {
                    logger.error('Service discovery error:', error);
                });
            });
        }, this.updateInterval);

        // Regular health checks
        setInterval(() => {
            this.services.forEach((_, name) => {
                this._checkHealth(name).catch(error => {
                    logger.error('Health check error:', error);
                });
            });
        }, this.healthCheckInterval);
    }

    _validateServiceDetails(details) {
        const requiredFields = ['discoveryType'];
        for (const field of requiredFields) {
            if (!details[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (!['dns', 'static', 'env'].includes(details.discoveryType)) {
            throw new Error('Invalid discovery type');
        }

        if (details.discoveryType === 'dns' && !details.domain) {
            throw new Error('DNS discovery requires domain field');
        }

        if (details.discoveryType === 'env' && !details.envPrefix) {
            throw new Error('Environment discovery requires envPrefix field');
        }
    }
}

// Example usage:
/*
const serviceDiscovery = new ServiceDiscovery({
    updateInterval: 30000,
    healthCheckInterval: 10000
});

// Register a service
await serviceDiscovery.registerService('auth-service', {
    discoveryType: 'dns',
    domain: 'auth.service.local',
    healthCheck: async (instance) => {
        try {
            const response = await fetch(`http://${instance.host}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
});

// Get service instance
const instance = await serviceDiscovery.getService('auth-service');
*/

export default ServiceDiscovery;
