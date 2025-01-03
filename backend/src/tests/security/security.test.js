import request from 'supertest';
import app from '../../app.js';
import { jest } from '@jest/globals';

describe('Security Tests', () => {
    describe('Authentication & Authorization', () => {
        it('should prevent unauthorized access', async () => {
            const response = await request(app)
                .get('/api/metrics');

            expect(response.status).toBe(401);
        });

        it('should validate JWT tokens', async () => {
            const response = await request(app)
                .get('/api/metrics')
                .set('Authorization', 'Bearer invalid.token.here');

            expect(response.status).toBe(401);
        });

        it('should handle token expiration', async () => {
            // Create an expired token
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
                'eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjB9.' +
                'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

            const response = await request(app)
                .get('/api/metrics')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(401);
        });
    });

    describe('Input Validation', () => {
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

        it('should prevent SQL injection', async () => {
            const response = await request(app)
                .get('/api/metrics')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    query: "'; DROP TABLE users; --"
                });

            expect(response.status).toBe(400);
        });

        it('should prevent XSS attacks', async () => {
            const response = await request(app)
                .post('/api/metrics')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: '<script>alert("xss")</script>'
                });

            expect(response.status).toBe(400);
        });

        it('should validate file uploads', async () => {
            const response = await request(app)
                .post('/api/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', Buffer.from('test'), {
                    filename: 'test.exe'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Rate Limiting', () => {
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

        it('should limit request rate', async () => {
            const requests = Array.from({ length: 100 }, () =>
                request(app)
                    .get('/api/metrics')
                    .set('Authorization', `Bearer ${authToken}`)
            );

            const responses = await Promise.all(requests);
            const tooManyRequests = responses.filter(r => r.status === 429);
            expect(tooManyRequests.length).toBeGreaterThan(0);
        });

        it('should limit login attempts', async () => {
            const attempts = Array.from({ length: 10 }, () =>
                request(app)
                    .post('/api/auth/login')
                    .send({
                        username: 'testuser',
                        password: 'wrongpass'
                    })
            );

            const responses = await Promise.all(attempts);
            const lastResponse = responses[responses.length - 1];
            expect(lastResponse.status).toBe(429);
        });
    });

    describe('Data Protection', () => {
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

        it('should encrypt sensitive data', async () => {
            const response = await request(app)
                .post('/api/user/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    email: 'test@example.com',
                    phone: '1234567890'
                });

            expect(response.status).toBe(200);
            // Verify data is encrypted in database
            const user = await User.findOne({ username: 'testuser' });
            expect(user.email).not.toBe('test@example.com');
        });

        it('should protect against CSRF', async () => {
            const response = await request(app)
                .post('/api/user/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .set('Origin', 'http://malicious-site.com')
                .send({
                    email: 'hacked@example.com'
                });

            expect(response.status).toBe(403);
        });
    });

    describe('API Security', () => {
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

        it('should validate API keys', async () => {
            const response = await request(app)
                .get('/api/metrics')
                .set('X-API-Key', 'invalid-key');

            expect(response.status).toBe(401);
        });

        it('should verify request signatures', async () => {
            const timestamp = Date.now().toString();
            const signature = 'invalid-signature';

            const response = await request(app)
                .post('/api/metrics')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Timestamp', timestamp)
                .set('X-Signature', signature)
                .send({
                    data: 'test'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('WebSocket Security', () => {
        it('should require authentication for WebSocket connections', async () => {
            const ws = new WebSocket(
                `ws://localhost:${process.env.PORT}/ws`
            );

            await new Promise((resolve) => {
                ws.on('error', (error) => {
                    expect(error).toBeTruthy();
                    resolve();
                });
            });
        });

        it('should validate WebSocket messages', async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'testuser',
                    password: 'testpass'
                });

            const ws = new WebSocket(
                `ws://localhost:${process.env.PORT}/ws?token=${loginResponse.body.token}`
            );

            await new Promise((resolve) => {
                ws.on('open', () => {
                    ws.send('invalid-message');
                });

                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    expect(message.error).toBeTruthy();
                    ws.close();
                    resolve();
                });
            });
        });
    });
});
