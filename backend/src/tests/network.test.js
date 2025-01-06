import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '@/index.js';
import NetworkMetrics from '../models/NetworkMetrics.js';
import Device from '../models/Device.js';

// Mock the models
jest.mock('../models/NetworkMetrics.js');
jest.mock('../models/Device.js');

describe('Network API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/network/metrics', () => {
        it('should get network metrics', async () => {
            const mockMetrics = [
                {
                    deviceId: 'device123',
                    timestamp: new Date(),
                    metrics: {
                        bandwidth: 100,
                        latency: 5
                    }
                }
            ];

            NetworkMetrics.find.mockResolvedValue(mockMetrics);

            const response = await request(app)
                .get('/api/network/metrics')
                .set('Authorization', 'Bearer valid-token');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    deviceId: 'device123',
                    metrics: expect.objectContaining({
                        bandwidth: 100,
                        latency: 5
                    })
                })
            ]));
        });

        it('should handle errors when getting metrics', async () => {
            NetworkMetrics.find.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/network/metrics')
                .set('Authorization', 'Bearer valid-token');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/network/devices', () => {
        it('should create a new device', async () => {
            const mockDevice = {
                name: 'Test Device',
                type: 'router',
                ipAddress: '192.168.1.1',
                macAddress: '00:11:22:33:44:55'
            };

            Device.create.mockResolvedValue(mockDevice);

            const response = await request(app)
                .post('/api/network/devices')
                .set('Authorization', 'Bearer valid-token')
                .send(mockDevice);

            expect(response.status).toBe(201);
            expect(response.body).toEqual(expect.objectContaining(mockDevice));
        });

        it('should validate device data', async () => {
            const invalidDevice = {
                name: 'Test Device'
                // Missing required fields
            };

            const response = await request(app)
                .post('/api/network/devices')
                .set('Authorization', 'Bearer valid-token')
                .send(invalidDevice);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/network/topology', () => {
        it('should get network topology', async () => {
            const mockDevices = [
                {
                    _id: 'device123',
                    name: 'Router 1',
                    type: 'router',
                    connections: ['device456']
                },
                {
                    _id: 'device456',
                    name: 'Switch 1',
                    type: 'switch',
                    connections: ['device123']
                }
            ];

            Device.find.mockResolvedValue(mockDevices);

            const response = await request(app)
                .get('/api/network/topology')
                .set('Authorization', 'Bearer valid-token');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('nodes');
            expect(response.body).toHaveProperty('edges');
            expect(response.body.nodes.length).toBe(2);
            expect(response.body.edges.length).toBe(1);
        });

        it('should handle errors when getting topology', async () => {
            Device.find.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/network/topology')
                .set('Authorization', 'Bearer valid-token');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/network/scan', () => {
        it('should scan network range', async () => {
            const mockResults = {
                devicesFound: 5,
                newDevices: 2,
                scanDuration: 10
            };

            // Mock the network scanning function
            jest.spyOn(global, 'setTimeout').mockImplementation(cb => cb());
            Device.create.mockResolvedValue({});

            const response = await request(app)
                .post('/api/network/scan')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    range: '192.168.1.0/24'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('scanId');
        });

        it('should validate scan parameters', async () => {
            const response = await request(app)
                .post('/api/network/scan')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    range: 'invalid-range'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
});
