import logger from './logger.js';

class RetryHandler {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.baseDelay = options.baseDelay || 1000;
        this.maxDelay = options.maxDelay || 30000;
        this.exponentialBase = options.exponentialBase || 2;
        this.timeout = options.timeout || 30000;
        this.retryableErrors = options.retryableErrors || [
            'ECONNRESET',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'NETWORK_ERROR',
            'SERVICE_UNAVAILABLE'
        ];
    }

    async execute(operation, context = {}) {
        let lastError;
        let delay = this.baseDelay;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                // Execute operation with timeout
                const result = await this._withTimeout(operation, context);
                
                // Log successful retry if not first attempt
                if (attempt > 1) {
                    logger.info('Operation succeeded after retry', {
                        attempt,
                        context: this._sanitizeContext(context)
                    });
                }

                return result;

            } catch (error) {
                lastError = error;

                if (!this._isRetryable(error) || attempt === this.maxRetries) {
                    break;
                }

                // Log retry attempt
                logger.warn('Operation failed, scheduling retry', {
                    attempt,
                    delay,
                    error: error.message,
                    context: this._sanitizeContext(context)
                });

                // Wait before retrying
                await this._delay(delay);

                // Calculate next delay with exponential backoff and jitter
                delay = Math.min(
                    this.maxDelay,
                    delay * this.exponentialBase * (1 + Math.random() * 0.1)
                );
            }
        }

        // Log final failure
        logger.error('Operation failed after all retries', {
            maxRetries: this.maxRetries,
            error: lastError,
            context: this._sanitizeContext(context)
        });

        throw lastError;
    }

    async _withTimeout(operation, context) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Operation timed out'));
            }, this.timeout);

            operation(context)
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timeoutId));
        });
    }

    _isRetryable(error) {
        // Check if error code is in retryable list
        if (this.retryableErrors.includes(error.code)) {
            return true;
        }

        // Check if error is a network error
        if (error.message?.includes('network') || error.message?.includes('timeout')) {
            return true;
        }

        // Check HTTP status codes
        if (error.status) {
            // Retry on service unavailable or gateway errors
            return [429, 503, 502, 504].includes(error.status);
        }

        return false;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _sanitizeContext(context) {
        // Remove sensitive data before logging
        const sanitized = { ...context };
        delete sanitized.credentials;
        delete sanitized.apiKey;
        delete sanitized.token;
        return sanitized;
    }

    // Utility method for common retry scenarios
    static async retryRequest(request, options = {}) {
        const retryHandler = new RetryHandler(options);
        return retryHandler.execute(async () => {
            const response = await request();
            
            // Validate response
            if (!response.ok) {
                const error = new Error('Request failed');
                error.status = response.status;
                throw error;
            }

            return response;
        });
    }
}

// Example usage:
/*
const retryHandler = new RetryHandler({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000
});

try {
    const result = await retryHandler.execute(async (context) => {
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    }, { requestId: 'unique-id' });
} catch (error) {
    console.error('Operation failed permanently:', error);
}
*/

export default RetryHandler;
