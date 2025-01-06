import { generalLimiter, loginLimiter, apiRateLimiter, options } from '../../middleware/rateLimiter.js';
import { jest } from '@jest/globals';

describe('Rate Limiter Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {
            ip: '127.0.0.1',
            path: '/api/test'
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    describe('General Rate Limiter', () => {
        it('should have correct configuration', () => {
            expect(options.general.windowMs).toBe(15 * 60 * 1000); // 15 minutes
            expect(options.general.max).toBe(100);
        });

        it('should skip rate limiting for localhost', () => {
            const result = options.general.skip(mockReq);
            expect(result).toBe(true);
        });

        it('should generate correct key', () => {
            const key = options.general.keyGenerator(mockReq);
            expect(key).toBe('general:127.0.0.1');
        });
    });

    describe('Login Rate Limiter', () => {
        it('should have correct configuration', () => {
            expect(options.login.windowMs).toBe(60 * 60 * 1000); // 1 hour
            expect(options.login.max).toBe(5);
        });

        it('should skip rate limiting for localhost', () => {
            const result = options.login.skip(mockReq);
            expect(result).toBe(true);
        });

        it('should generate correct key', () => {
            const key = options.login.keyGenerator(mockReq);
            expect(key).toBe('login:127.0.0.1');
        });
    });

    describe('API Rate Limiter', () => {
        it('should have correct configuration', () => {
            expect(options.api.windowMs).toBe(60 * 1000); // 1 minute
            expect(options.api.max).toBe(100);
        });

        it('should skip rate limiting for localhost', () => {
            const result = options.api.skip(mockReq);
            expect(result).toBe(true);
        });

        it('should generate correct key', () => {
            const key = options.api.keyGenerator(mockReq);
            expect(key).toBe('api:127.0.0.1');
        });
    });

    describe('Rate Limiter Handler', () => {
        it('should return correct error response', () => {
            const handler = options.general.handler;
            handler(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Too many general requests',
                retryAfter: Math.ceil(15 * 60 * 1000 / 1000)
            });
        });
    });
});
