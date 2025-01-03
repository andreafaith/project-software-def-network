import request from 'supertest';
import app from '../../app.js';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

describe('API Integration Tests', () => {
    describe('Authentication', () => {
        it('should authenticate user with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'testuser',
                    password: 'testpass'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
        });

        it('should reject invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'invalid',
                    password: 'invalid'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('Data Collection', () => {
        let authToken;

        beforeEach(async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'testuser',
                    password: 'testpass'
                });
            authToken = loginResponse.body.token;
        });

        it('should collect network metrics', async () => {
            const response = await request(app)
                .post('/api/metrics/collect')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    deviceId: 'test-device',
                    metrics: {
                        bandwidth: 100,
                        latency: 50,
                        errors: 0
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });

        it('should validate metric data', async () => {
            const response = await request(app)
                .post('/api/metrics/collect')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    deviceId: 'test-device',
                    metrics: {
                        bandwidth: 'invalid'
                    }
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Real-time Updates', () => {
        let authToken;

        beforeEach(async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'testuser',
                    password: 'testpass'
                });
            authToken = loginResponse.body.token;
        });

        it('should establish WebSocket connection', async () => {
            const ws = new WebSocket(
                `ws://localhost:${process.env.PORT}/ws?token=${authToken}`
            );

            await new Promise((resolve) => {
                ws.on('open', () => {
                    expect(ws.readyState).toBe(WebSocket.OPEN);
                    ws.close();
                    resolve();
                });
            });
        });

        it('should receive real-time updates', async () => {
            const ws = new WebSocket(
                `ws://localhost:${process.env.PORT}/ws?token=${authToken}`
            );

            await new Promise((resolve) => {
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    expect(message).toHaveProperty('type');
                    expect(message).toHaveProperty('data');
                    ws.close();
                    resolve();
                });

                // Trigger an update
                request(app)
                    .post('/api/metrics/collect')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        deviceId: 'test-device',
                        metrics: {
                            bandwidth: 100
                        }
                    });
            });
        });
    });

    describe('Analytics', () => {
        let authToken;

        beforeEach(async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'testuser',
                    password: 'testpass'
                });
            authToken = loginResponse.body.token;
        });

        it('should generate analytics report', async () => {
            const response = await request(app)
                .get('/api/analytics/report')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: '2025-01-01',
                    endDate: '2025-01-02'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('metrics');
        });

        it('should validate date range', async () => {
            const response = await request(app)
                .get('/api/analytics/report')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: 'invalid',
                    endDate: '2025-01-02'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 errors', async () => {
            const response = await request(app)
                .get('/api/nonexistent');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle validation errors', async () => {
            const response = await request(app)
                .post('/api/metrics/collect')
                .send({
                    invalidField: true
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle internal server errors', async () => {
            // Mock a function to throw an error
            jest.spyOn(mongoose.Model, 'find').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const response = await request(app)
                .get('/api/metrics');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });
});
