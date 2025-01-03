import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import EncryptionService from './EncryptionService.js';

const AuditLogSchema = new mongoose.Schema({
    timestamp: { type: Date, required: true, index: true },
    actor: {
        id: { type: String, required: true, index: true },
        type: { type: String, required: true },
        ip: String,
        userAgent: String
    },
    action: {
        type: { type: String, required: true, index: true },
        target: {
            type: { type: String, required: true },
            id: { type: String, required: true },
            name: String
        },
        status: { type: String, required: true },
        details: mongoose.Schema.Types.Mixed
    },
    metadata: {
        requestId: { type: String, required: true, unique: true },
        sessionId: String,
        correlationId: String,
        environment: String
    },
    securityContext: {
        authMethod: String,
        permissions: [String],
        roles: [String],
        encrypted: { type: Boolean, default: false }
    }
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

class AuditLogger {
    constructor() {
        this.encryptionKey = process.env.AUDIT_LOG_ENCRYPTION_KEY;
        this.sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
        this.retentionPeriod = 365; // days
    }

    async log(auditEvent) {
        try {
            // Validate audit event
            this._validateAuditEvent(auditEvent);

            // Sanitize sensitive data
            const sanitizedEvent = this._sanitizeEvent(auditEvent);

            // Add metadata
            const enrichedEvent = this._enrichEvent(sanitizedEvent);

            // Encrypt sensitive fields if needed
            const finalEvent = await this._encryptSensitiveData(enrichedEvent);

            // Create audit log entry
            const auditLog = new AuditLog(finalEvent);
            await auditLog.save();

            // Clean up old logs
            await this._cleanupOldLogs();

            return auditLog;
        } catch (error) {
            logger.error('Error creating audit log:', error);
            throw error;
        }
    }

    async search(query) {
        try {
            const {
                startDate,
                endDate,
                actorId,
                actionType,
                targetType,
                status,
                limit = 100,
                offset = 0
            } = query;

            // Build MongoDB query
            const mongoQuery = this._buildSearchQuery({
                startDate,
                endDate,
                actorId,
                actionType,
                targetType,
                status
            });

            // Execute search
            const logs = await AuditLog.find(mongoQuery)
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(limit);

            // Decrypt sensitive data if needed
            const decryptedLogs = await Promise.all(
                logs.map(log => this._decryptSensitiveData(log))
            );

            return decryptedLogs;
        } catch (error) {
            logger.error('Error searching audit logs:', error);
            throw error;
        }
    }

    async aggregate(query) {
        try {
            const {
                startDate,
                endDate,
                groupBy,
                metrics
            } = query;

            // Build aggregation pipeline
            const pipeline = this._buildAggregationPipeline({
                startDate,
                endDate,
                groupBy,
                metrics
            });

            // Execute aggregation
            const results = await AuditLog.aggregate(pipeline);

            return results;
        } catch (error) {
            logger.error('Error aggregating audit logs:', error);
            throw error;
        }
    }

    // Private helper methods
    _validateAuditEvent(event) {
        const requiredFields = [
            'actor.id',
            'actor.type',
            'action.type',
            'action.target.type',
            'action.target.id',
            'action.status'
        ];

        for (const field of requiredFields) {
            if (!this._getNestedValue(event, field)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
    }

    _sanitizeEvent(event) {
        const sanitized = JSON.parse(JSON.stringify(event));
        this._recursiveSanitize(sanitized);
        return sanitized;
    }

    _recursiveSanitize(obj) {
        for (const key in obj) {
            if (this.sensitiveFields.includes(key.toLowerCase())) {
                obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this._recursiveSanitize(obj[key]);
            }
        }
    }

    _enrichEvent(event) {
        return {
            ...event,
            timestamp: new Date(),
            metadata: {
                ...event.metadata,
                requestId: this._generateRequestId(),
                environment: process.env.NODE_ENV
            }
        };
    }

    async _encryptSensitiveData(event) {
        if (!this.encryptionKey) return event;

        const encrypted = JSON.parse(JSON.stringify(event));
        if (encrypted.action.details) {
            encrypted.action.details = await EncryptionService.encrypt(
                encrypted.action.details,
                this.encryptionKey
            );
            encrypted.securityContext.encrypted = true;
        }

        return encrypted;
    }

    async _decryptSensitiveData(log) {
        if (!this.encryptionKey || !log.securityContext.encrypted) {
            return log;
        }

        const decrypted = log.toObject();
        if (decrypted.action.details) {
            decrypted.action.details = await EncryptionService.decrypt(
                decrypted.action.details,
                this.encryptionKey
            );
        }

        return decrypted;
    }

    _buildSearchQuery(params) {
        const query = {};

        if (params.startDate || params.endDate) {
            query.timestamp = {};
            if (params.startDate) {
                query.timestamp.$gte = new Date(params.startDate);
            }
            if (params.endDate) {
                query.timestamp.$lte = new Date(params.endDate);
            }
        }

        if (params.actorId) {
            query['actor.id'] = params.actorId;
        }

        if (params.actionType) {
            query['action.type'] = params.actionType;
        }

        if (params.targetType) {
            query['action.target.type'] = params.targetType;
        }

        if (params.status) {
            query['action.status'] = params.status;
        }

        return query;
    }

    _buildAggregationPipeline(params) {
        const pipeline = [];

        // Match stage
        const match = {};
        if (params.startDate || params.endDate) {
            match.timestamp = {};
            if (params.startDate) {
                match.timestamp.$gte = new Date(params.startDate);
            }
            if (params.endDate) {
                match.timestamp.$lte = new Date(params.endDate);
            }
        }
        pipeline.push({ $match: match });

        // Group stage
        const group = {
            _id: this._getGroupByExpression(params.groupBy)
        };
        for (const metric of params.metrics) {
            group[metric] = this._getMetricExpression(metric);
        }
        pipeline.push({ $group: group });

        // Sort stage
        pipeline.push({ $sort: { _id: 1 } });

        return pipeline;
    }

    _getGroupByExpression(groupBy) {
        switch (groupBy) {
            case 'hour':
                return {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' },
                    hour: { $hour: '$timestamp' }
                };
            case 'day':
                return {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' }
                };
            case 'month':
                return {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' }
                };
            default:
                return '$' + groupBy;
        }
    }

    _getMetricExpression(metric) {
        switch (metric) {
            case 'count':
                return { $sum: 1 };
            case 'distinctActors':
                return { $addToSet: '$actor.id' };
            case 'successRate':
                return {
                    $avg: {
                        $cond: [
                            { $eq: ['$action.status', 'success'] },
                            1,
                            0
                        ]
                    }
                };
            default:
                return { $sum: 1 };
        }
    }

    _generateRequestId() {
        return crypto.randomBytes(16).toString('hex');
    }

    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => 
            current && current[key], obj);
    }

    async _cleanupOldLogs() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionPeriod);

        await AuditLog.deleteMany({
            timestamp: { $lt: cutoffDate }
        });
    }
}

export default new AuditLogger();
