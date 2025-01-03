export default {
    transform: {
        '^.+\\.jsx?$': 'babel-jest'
    },
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    reporters: ['default', './src/tests/reporters/DiscordReporter.js'],
    verbose: true,
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
};
