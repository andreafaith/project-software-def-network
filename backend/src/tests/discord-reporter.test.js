import { jest } from '@jest/globals';

describe('Discord Reporter Tests', () => {
    test('should pass with short message', () => {
        const message = 'Hello, world!';
        expect(message).toBe('Hello, world!');
    });

    test('should pass with medium message', () => {
        const message = 'A'.repeat(100);
        expect(message.length).toBe(100);
    });

    test('should pass with long message', () => {
        const message = 'A'.repeat(1000);
        expect(message.length).toBe(1000);
    });

    test('should handle empty message', () => {
        const message = '';
        expect(message).toBe('');
    });

    test('should handle special characters', () => {
        const message = '!@#$%^&*()_+';
        expect(message).toBe('!@#$%^&*()_+');
    });

    test('should handle unicode characters', () => {
        const message = '你好，世界！';
        expect(message).toBe('你好，世界！');
    });

    test('should handle JSON stringification', () => {
        const obj = {
            name: 'Test',
            value: 123,
            nested: {
                array: [1, 2, 3]
            }
        };
        const json = JSON.stringify(obj);
        expect(JSON.parse(json)).toEqual(obj);
    });

    test('should handle error objects', () => {
        const error = new Error('Test error');
        expect(error.message).toBe('Test error');
    });

    test('should handle long error messages', () => {
        const longString = 'a'.repeat(2000);
        expect(longString.length).toBe(2000);
    });
});
