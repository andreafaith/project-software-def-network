import { jest } from '@jest/globals';
import { sqlInjectionPrevention } from '../../middleware/sqlInjectionPrevention.js';
import { createTestRequest, createTestResponse } from '../testHelper.js';

describe('SQL Injection Prevention Middleware', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = createTestRequest();
        res = createTestResponse();
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should allow safe query parameters', async () => {
        req.query = {
            name: 'test',
            id: '123'
        };

        sqlInjectionPrevention(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('should block SQL injection in query parameters', async () => {
        req.query = {
            name: "test' OR '1'='1"
        };

        sqlInjectionPrevention(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('should block SQL injection in request body', async () => {
        req.body = {
            username: "admin' --",
            password: "' OR '1'='1"
        };

        sqlInjectionPrevention(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('should handle nested objects in request body', async () => {
        req.body = {
            user: {
                name: "test' OR '1'='1",
                details: {
                    address: "123' UNION SELECT * FROM users --"
                }
            }
        };

        sqlInjectionPrevention(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('should handle arrays in request body', async () => {
        req.body = {
            items: ["test", "normal", "' OR '1'='1"]
        };

        sqlInjectionPrevention(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('should handle null and undefined values', async () => {
        req.body = {
            nullValue: null,
            undefinedValue: undefined,
            validValue: 'test'
        };

        sqlInjectionPrevention(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('should handle empty objects and arrays', async () => {
        req.body = {
            emptyObject: {},
            emptyArray: [],
            validValue: 'test'
        };

        sqlInjectionPrevention(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('should handle special characters in safe strings', async () => {
        req.body = {
            name: "O'Connor",
            query: "SELECT * FROM table",
            comment: "--This is a comment"
        };

        sqlInjectionPrevention(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
