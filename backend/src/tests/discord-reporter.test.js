describe('Discord Reporter Test Suite', () => {
    // Success test
    test('should pass successfully', () => {
        expect(1 + 1).toBe(2);
    });

    // Failure test
    test('should fail with wrong assertion', () => {
        expect(1 + 1).toBe(3);
    });

    // Error test
    test('should throw an error', () => {
        throw new Error('This is a test error');
    });

    // Skipped test
    test.skip('should be skipped', () => {
        expect(true).toBe(false);
    });

    // Async success test
    test('should pass async test', async () => {
        const result = await Promise.resolve(42);
        expect(result).toBe(42);
    });

    // Async failure test
    test('should fail async test', async () => {
        await expect(Promise.reject('error')).resolves.toBe('success');
    });

    // Long running test
    test('should take some time', async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(true).toBe(true);
    });

    // Test with long error message
    test('should fail with long error', () => {
        const longString = 'a'.repeat(2000);
        expect(longString).toBe('b'.repeat(2000));
    });
});
