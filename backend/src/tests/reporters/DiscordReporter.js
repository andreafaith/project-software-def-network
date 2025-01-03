import DiscordReporter from '../../services/DiscordReporter.js';

class JestDiscordReporter {
    constructor(globalConfig, options) {
        this._globalConfig = globalConfig;
        this._options = options;
        this._startTime = Date.now();
    }

    onRunStart() {
        this._startTime = Date.now();
    }

    onRunComplete(contexts, results) {
        // Calculate total failed tests from test suites
        let totalFailedTests = 0;
        results.testResults.forEach(suite => {
            totalFailedTests += suite.numFailingTests;
        });

        // Update the results with correct counts
        const resultsWithTime = {
            ...results,
            startTime: this._startTime,
            numFailedTests: totalFailedTests,
            numTotalTests: results.numTotalTests || results.testResults.reduce((acc, suite) => acc + suite.numPassingTests + suite.numFailingTests + suite.numPendingTests, 0)
        };

        console.log('Test Results:', {
            failedSuites: results.numFailedTestSuites,
            totalSuites: results.numTotalTestSuites,
            failedTests: totalFailedTests,
            totalTests: resultsWithTime.numTotalTests
        });

        return DiscordReporter.sendTestReport(resultsWithTime);
    }
}

export default JestDiscordReporter;
