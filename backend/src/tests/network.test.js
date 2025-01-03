import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index.js';
import NetworkDevice from '../models/NetworkDevice.js';
import NetworkTopology from '../models/NetworkTopology.js';
import NetworkMetrics from '../models/NetworkMetrics.js';

describe('Network Monitoring API Tests', () => {
    let authToken;
    let testDevice;

    beforeAll(async () => {
        // Login and get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'admin123'
            });
        authToken = loginResponse.body.token;

        // Create test device
        testDevice = await NetworkDevice.create({
            name: 'Test Router',
            type: 'router',
            manufacturer: 'Cisco',
            model: 'Test-1000',
            status: 'active'
        });
    });

    afterAll(async () => {
        // Cleanup
        await NetworkDevice.deleteMany({});
        await NetworkTopology.deleteMany({});
        await NetworkMetrics.deleteMany({});
        await mongoose.connection.close();
    });

    describe('Device Discovery', () => {
        it('should discover network devices', async () => {
            const response = await request(app)
                .post('/api/network/discover')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ subnet: '192.168.1.0/24' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Topology Mapping', () => {
        it('should create network topology', async () => {
            const response = await request(app)
                .post('/api/network/topology/map')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('connections');
        });

        it('should get current topology', async () => {
            const response = await request(app)
                .get('/api/network/topology')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('name');
        });
    });

    describe('Bandwidth Monitoring', () => {
        it('should monitor device bandwidth', async () => {
            const response = await request(app)
                .post(`/api/network/metrics/bandwidth/${testDevice._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ interfaceName: 'eth0' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('metrics.bandwidth');
        });

        it('should get device metrics', async () => {
            const response = await request(app)
                .get(`/api/network/metrics/${testDevice._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startTime: new Date(Date.now() - 3600000).toISOString(),
                    endTime: new Date().toISOString()
                });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Health Checks', () => {
        it('should check device health', async () => {
            const response = await request(app)
                .get(`/api/network/health/${testDevice._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('metrics');
        });

        it('should perform bulk health check', async () => {
            const response = await request(app)
                .post('/api/network/health/bulk')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ deviceIds: [testDevice._id] });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Device Status', () => {
        it('should track device status', async () => {
            const response = await request(app)
                .get(`/api/network/status/${testDevice._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status');
        });
    });

    describe('Alerts', () => {
        it('should generate alert', async () => {
            const response = await request(app)
                .post('/api/network/alert')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    deviceId: testDevice._id,
                    type: 'performance',
                    severity: 'warning',
                    message: 'High CPU usage detected'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('message');
        });
    });
});
