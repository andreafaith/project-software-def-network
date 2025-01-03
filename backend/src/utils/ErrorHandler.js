import logger from './logger.js';

class AppError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        this.isOperational = true; // Indicates if error is operational or programming
        Error.captureStackTrace(this, this.constructor);
    }
}

class ErrorHandler {
    static async handleError(err, req, res, next) {
        const error = this.normalizeError(err);
        
        // Log error
        logger.error('Error occurred:', {
            code: error.code,
            message: error.message,
            stack: error.stack,
            details: error.details,
            path: req?.path,
            method: req?.method,
            timestamp: error.timestamp
        });

        // Track error metrics
        await this.trackErrorMetrics(error);

        // Send response
        if (!res.headersSent) {
            res.status(this.getHttpStatus(error.code)).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    timestamp: error.timestamp
                }
            });
        }
    }

    static normalizeError(err) {
        if (err instanceof AppError) {
            return err;
        }

        // Mongoose validation error
        if (err.name === 'ValidationError') {
            return new AppError(
                'VALIDATION_ERROR',
                'Validation failed',
                this.formatMongooseError(err)
            );
        }

        // MongoDB duplicate key error
        if (err.code === 11000) {
            return new AppError(
                'DUPLICATE_ERROR',
                'Duplicate key error',
                { key: Object.keys(err.keyPattern)[0] }
            );
        }

        // JWT errors
        if (err.name === 'JsonWebTokenError') {
            return new AppError('INVALID_TOKEN', 'Invalid token provided');
        }

        if (err.name === 'TokenExpiredError') {
            return new AppError('TOKEN_EXPIRED', 'Token has expired');
        }

        // Default error
        return new AppError(
            'INTERNAL_ERROR',
            'An unexpected error occurred',
            process.env.NODE_ENV === 'development' ? { originalError: err.message } : {}
        );
    }

    static formatMongooseError(err) {
        const errors = {};
        Object.keys(err.errors).forEach(key => {
            errors[key] = err.errors[key].message;
        });
        return errors;
    }

    static getHttpStatus(code) {
        const statusMap = {
            VALIDATION_ERROR: 400,
            INVALID_TOKEN: 401,
            TOKEN_EXPIRED: 401,
            UNAUTHORIZED: 401,
            FORBIDDEN: 403,
            NOT_FOUND: 404,
            DUPLICATE_ERROR: 409,
            RATE_LIMIT_EXCEEDED: 429,
            INTERNAL_ERROR: 500,
            SERVICE_UNAVAILABLE: 503
        };
        return statusMap[code] || 500;
    }

    static async trackErrorMetrics(error) {
        try {
            // Track error frequency
            await ErrorMetrics.create({
                code: error.code,
                timestamp: error.timestamp,
                details: {
                    message: error.message,
                    isOperational: error.isOperational
                }
            });

            // Emit error event for monitoring
            process.emit('applicationError', error);
        } catch (err) {
            logger.error('Error tracking metrics:', err);
        }
    }

    // Utility method for creating specific errors
    static badRequest(message, details = {}) {
        return new AppError('BAD_REQUEST', message, details);
    }

    static unauthorized(message = 'Unauthorized access', details = {}) {
        return new AppError('UNAUTHORIZED', message, details);
    }

    static forbidden(message = 'Forbidden access', details = {}) {
        return new AppError('FORBIDDEN', message, details);
    }

    static notFound(message = 'Resource not found', details = {}) {
        return new AppError('NOT_FOUND', message, details);
    }

    static rateLimitExceeded(message = 'Rate limit exceeded', details = {}) {
        return new AppError('RATE_LIMIT_EXCEEDED', message, details);
    }

    static serviceUnavailable(message = 'Service temporarily unavailable', details = {}) {
        return new AppError('SERVICE_UNAVAILABLE', message, details);
    }
}

export { AppError, ErrorHandler };
