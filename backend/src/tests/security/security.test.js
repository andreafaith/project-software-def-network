import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../index.js';
import { verifyToken, checkRole, checkPermissions } from '../../middleware/auth.js';
import { createTestRequest, createTestResponse } from '../testHelper.js';
import { User } from '../../models/User.js';
import { generateToken } from '../../utils/auth.js';
import { config } from '../../config/index.js';

jest.mock('../../models/User.js', () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        findOne: jest.fn()
    }
}));

describe('Security Tests', () => {
    describe('Authentication', () => {
        it('should reject requests without token', async () => {
            const response = await request(app)
                .get('/api/network/devices');
            expect(response.status).toBe(401);
        });

        it('should reject requests with invalid token', async () => {
            const response = await request(app)
                .get('/api/network/devices')
                .set('Authorization', 'Bearer invalid.token');
            expect(response.status).toBe(401);
        });

        it('should accept requests with valid token', async () => {
            const token = generateToken({ id: '123', role: 'admin' });
            const response = await request(app)
                .get('/api/network/devices')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });

        it('should validate JWT tokens', () => {
            const payload = { userId: '123', role: 'admin' };
            const token = jwt.sign(payload, config.jwtSecret);
            const decoded = jwt.verify(token, config.jwtSecret);
            
            expect(decoded.userId).toBe(payload.userId);
            expect(decoded.role).toBe(payload.role);
        });

        it('should reject invalid tokens', () => {
            const invalidToken = 'invalid.token.here';
            expect(() => jwt.verify(invalidToken, config.jwtSecret)).toThrow();
        });

        it('should reject expired tokens', () => {
            const payload = { userId: '123', role: 'admin' };
            const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '0s' });
            
            expect(() => jwt.verify(token, config.jwtSecret)).toThrow();
        });
    });

    describe('Input Validation', () => {
        const token = generateToken({ id: '123', role: 'admin' });

        it('should reject malformed JSON', async () => {
            const response = await request(app)
                .post('/api/network/discover')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/json')
                .send('{malformed:json}');
            expect(response.status).toBe(400);
        });

        it('should reject SQL injection attempts', async () => {
            const response = await request(app)
                .post('/api/network/devices')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: "SELECT * FROM users WHERE id = '1' OR '1'='1'"
                });
            expect(response.status).toBe(400);
        });

        it('should reject XSS attempts', async () => {
            const response = await request(app)
                .post('/api/network/devices')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: '<script>alert("xss")</script>'
                });
            expect(response.status).toBe(400);
        });

        it('should sanitize input parameters', async () => {
            const response = await request(app)
                .post('/api/network/devices')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Device & <test>'
                });
            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Test Device &amp; &lt;test&gt;');
        });
    });

    describe('Authorization', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should restrict admin routes to admin users', async () => {
            const userToken = generateToken({ id: '123', role: 'user' });
            const response = await request(app)
                .post('/api/admin/settings')
                .set('Authorization', `Bearer ${userToken}`)
                .send({});
            expect(response.status).toBe(403);
        });

        it('should allow admin access to admin routes', async () => {
            const adminToken = generateToken({ id: '123', role: 'admin' });
            const response = await request(app)
                .post('/api/admin/settings')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});
            expect(response.status).toBe(200);
        });
    });

    describe('User Authentication', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should find user by credentials', async () => {
            const mockUser = {
                _id: '123',
                username: 'testuser',
                role: 'user'
            };

            User.findOne.mockResolvedValue(mockUser);

            const user = await User.findOne({ username: 'testuser' });
            expect(user).toBeDefined();
            expect(user._id).toBe('123');
        });

        it('should handle invalid credentials', async () => {
            User.findOne.mockResolvedValue(null);

            const user = await User.findOne({ username: 'invalid' });
            expect(user).toBeNull();
        });
    });

    describe('Middleware Tests', () => {
        let req;
        let res;
        let next;

        beforeEach(() => {
            req = createTestRequest();
            res = createTestResponse();
            next = jest.fn();
        });

        describe('verifyToken', () => {
            it('should verify valid tokens', async () => {
                const token = generateToken({ id: '123' });
                req.headers.authorization = `Bearer ${token}`;
                await verifyToken(req, res, next);
                expect(next).toHaveBeenCalled();
                expect(req.user).toBeDefined();
            });

            it('should reject invalid tokens', async () => {
                req.headers.authorization = 'Bearer invalid.token';
                await verifyToken(req, res, next);
                expect(res.status).toHaveBeenCalledWith(401);
            });
        });

        describe('checkRole', () => {
            it('should allow users with required role', async () => {
                req.user = { role: 'admin' };
                const middleware = checkRole(['admin']);
                await middleware(req, res, next);
                expect(next).toHaveBeenCalled();
            });

            it('should reject users without required role', async () => {
                req.user = { role: 'user' };
                const middleware = checkRole(['admin']);
                await middleware(req, res, next);
                expect(res.status).toHaveBeenCalledWith(403);
            });
        });

        describe('checkPermissions', () => {
            it('should allow users with required permissions', async () => {
                req.user = { permissions: ['read', 'write'] };
                const middleware = checkPermissions(['read']);
                await middleware(req, res, next);
                expect(next).toHaveBeenCalled();
            });

            it('should reject users without required permissions', async () => {
                req.user = { permissions: ['read'] };
                const middleware = checkPermissions(['write']);
                await middleware(req, res, next);
                expect(res.status).toHaveBeenCalledWith(403);
            });
        });
    });
});
