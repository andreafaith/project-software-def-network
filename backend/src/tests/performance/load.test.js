import autocannon from 'autocannon';
import { promisify } from 'util';
import app from '../../app.js';

const run = promisify(autocannon);

describe('Load Testing', () => {
    let server;
    let authToken;

    beforeAll(async () => {
        server = app.listen(0);
        const response = await fetch(`http://localhost:${server.address().port}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'testuser',
                password: 'testpass'
            })
        });
        const data = await response.json();
        authToken = data.token;
    });

    afterAll((done) => {
        server.close(done);
    });

    it('should handle high load on metrics endpoint', async () => {
        const instance = autocannon({
            url: `http://localhost:${server.address().port}/api/metrics`,
            connections: 100,
            duration: 10,
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const results = await run(instance);
        
        expect(results.errors).toBe(0);
        expect(results.timeouts).toBe(0);
        expect(results.non2xx).toBe(0);
        expect(results.latency.p99).toBeLessThan(1000);
    });

    it('should handle concurrent WebSocket connections', async () => {
        const instance = autocannon({
            url: `ws://localhost:${server.address().port}/ws`,
            connections: 50,
            duration: 10,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            workers: 4,
            websocket: true
        });

        const results = await run(instance);
        
        expect(results.errors).toBe(0);
        expect(results.timeouts).toBe(0);
        expect(results.latency.p99).toBeLessThan(1000);
    });

    it('should handle data processing under load', async () => {
        const instance = autocannon({
            url: `http://localhost:${server.address().port}/api/metrics/process`,
            connections: 50,
            duration: 10,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({
                deviceId: 'test-device',
                metrics: {
                    bandwidth: 100,
                    latency: 50,
                    timestamp: new Date()
                }
            })
        });

        const results = await run(instance);
        
        expect(results.errors).toBe(0);
        expect(results.timeouts).toBe(0);
        expect(results.non2xx).toBe(0);
        expect(results.latency.p99).toBeLessThan(2000);
    });

    it('should handle analytics queries under load', async () => {
        const instance = autocannon({
            url: `http://localhost:${server.address().port}/api/analytics/report`,
            connections: 20,
            duration: 10,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            queryString: {
                startDate: '2025-01-01',
                endDate: '2025-01-02'
            }
        });

        const results = await run(instance);
        
        expect(results.errors).toBe(0);
        expect(results.timeouts).toBe(0);
        expect(results.non2xx).toBe(0);
        expect(results.latency.p99).toBeLessThan(3000);
    });

    it('should handle real-time updates under load', async () => {
        const instance = autocannon({
            url: `http://localhost:${server.address().port}/api/stream`,
            connections: 30,
            duration: 10,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            workers: 2
        });

        const results = await run(instance);
        
        expect(results.errors).toBe(0);
        expect(results.timeouts).toBe(0);
        expect(results.latency.p99).toBeLessThan(1500);
    });
});
