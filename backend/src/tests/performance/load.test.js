import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../index.js';
import { generateToken } from '../../utils/auth.js';

describe('Load Testing', () => {
    let token;

    beforeAll(() => {
        token = generateToken({ id: 'test123', role: 'admin' });
    });

    test('should handle concurrent API requests', async () => {
        const numRequests = 50;
        const requests = Array(numRequests).fill().map(() =>
            request(app)
                .get('/api/network/status')
                .set('Authorization', `Bearer ${token}`)
        );

        const responses = await Promise.all(requests);
        const successfulResponses = responses.filter(r => r.status === 200);
        expect(successfulResponses.length).toBe(numRequests);
    });

    test('should handle large payload', async () => {
        const largePayload = {
            devices: Array(100).fill().map((_, i) => ({
                id: `device${i}`,
                name: `Device ${i}`,
                type: 'router',
                status: 'active',
                metrics: {
                    cpu: Math.random() * 100,
                    memory: Math.random() * 100,
                    network: Math.random() * 1000
                }
            }))
        };

        const response = await request(app)
            .post('/api/network/devices/batch')
            .set('Authorization', `Bearer ${token}`)
            .send(largePayload);

        expect(response.status).toBe(200);
    });

    test('should handle rapid sequential requests', async () => {
        const numRequests = 20;
        const responses = [];

        for (let i = 0; i < numRequests; i++) {
            const response = await request(app)
                .get('/api/network/metrics')
                .set('Authorization', `Bearer ${token}`);
            responses.push(response);
        }

        const successfulResponses = responses.filter(r => r.status === 200);
        expect(successfulResponses.length).toBe(numRequests);
    });

    test('should handle multiple endpoints concurrently', async () => {
        const endpoints = [
            '/api/network/status',
            '/api/network/devices',
            '/api/network/metrics',
            '/api/network/alerts'
        ];

        const requests = endpoints.map(endpoint =>
            request(app)
                .get(endpoint)
                .set('Authorization', `Bearer ${token}`)
        );

        const responses = await Promise.all(requests);
        const successfulResponses = responses.filter(r => r.status === 200);
        expect(successfulResponses.length).toBe(endpoints.length);
    });

    test('should maintain response time under threshold', async () => {
        const startTime = Date.now();
        const response = await request(app)
            .get('/api/network/status')
            .set('Authorization', `Bearer ${token}`);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(1000); // Response should be under 1 second
    });
});
