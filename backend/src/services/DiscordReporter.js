import fetch from 'node-fetch';
import winston from 'winston';
import path from 'path';

class DiscordReporter {
    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discordapp.com/api/webhooks/1324166877051748434/EZCjS5vsg_RWkPlNb4Flapm-LwYrHIT11jsRHYg7zbOsGU2emK9jnZcEHB1KwRC9MMNM';
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [new winston.transports.Console()]
        });
    }

    getRelativePath(filePath) {
        // Remove ANSI escape codes
        filePath = filePath.replace(/\u001b\[\d+m/g, '');
        
        // Get the relative path from src/tests
        const parts = filePath.split('src\\tests\\');
        if (parts.length > 1) {
            return `tests/${parts[1].replace(/\\/g, '/')}`;
        }
        return path.basename(filePath);
    }

    async sendTestReport(testResult) {
        try {
            console.log('Received test results:', JSON.stringify(testResult, null, 2));
            
            // Count actual test failures by examining each test result
            let failedTests = 0;
            let totalTests = 0;
            let passedTests = 0;
            let pendingTests = 0;

            // Count test results from each test suite
            testResult.testResults.forEach(suite => {
                // If the suite failed to run, count it as one failed test
                if (suite.failureMessage) {
                    failedTests++;
                    totalTests++;
                    return;
                }

                // Count individual test results
                suite.testResults.forEach(test => {
                    totalTests++;
                    switch (test.status) {
                        case 'failed':
                            failedTests++;
                            break;
                        case 'passed':
                            passedTests++;
                            break;
                        case 'pending':
                        case 'skipped':
                            pendingTests++;
                            break;
                    }
                });
            });

            // If no individual tests were found but suites failed, count each failed suite
            if (totalTests === 0 && testResult.numFailedTestSuites > 0) {
                failedTests = testResult.numFailedTestSuites;
                totalTests = testResult.numTotalTestSuites;
            }

            const { numFailedTestSuites, numTotalTestSuites, startTime } = testResult;
            const duration = Date.now() - startTime;
            const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00';

            const embed = {
                title: '🧪 Test Suite Summary',
                color: failedTests > 0 ? 0xFF0000 : 0x00FF00,
                fields: [
                    {
                        name: 'Total Tests',
                        value: `${totalTests}`,
                        inline: true
                    },
                    {
                        name: 'Passed',
                        value: `✅ ${passedTests}`,
                        inline: true
                    },
                    {
                        name: 'Failed',
                        value: `❌ ${failedTests}`,
                        inline: true
                    },
                    {
                        name: 'Skipped',
                        value: `⏭️ ${pendingTests}`,
                        inline: true
                    },
                    {
                        name: 'Success Rate',
                        value: `${successRate}%`,
                        inline: true
                    },
                    {
                        name: 'Duration',
                        value: `⏱️ ${duration}ms`,
                        inline: true
                    }
                ],
                footer: {
                    text: `Project Eye Test Suite Reporter • ${new Date().toLocaleString()}`
                }
            };

            // Add failed test suites information
            if (numFailedTestSuites > 0) {
                const failedSuites = testResult.testResults
                    .filter(suite => suite.failureMessage || suite.numFailingTests > 0)
                    .map(suite => {
                        const relativePath = this.getRelativePath(suite.testFilePath);
                        if (suite.failureMessage) {
                            // For suite-level failures
                            return `**${relativePath}**\n❌ Suite Failed: Test suite failed to run`;
                        } else {
                            // For test-level failures
                            const failedTests = suite.testResults
                                .filter(test => test.status === 'failed')
                                .map(test => `❌ ${test.title}\n   ${test.failureMessages[0]?.split('\n')[0] || 'No error message'}`)
                                .join('\n');
                            return `**${relativePath}**\n${failedTests}`;
                        }
                    })
                    .join('\n\n');

                embed.fields.push({
                    name: `Failed Test Suites: ${numFailedTestSuites}/${numTotalTestSuites}`,
                    value: failedSuites.substring(0, 1024),
                    inline: false
                });
            }

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ embeds: [embed] })
            });

            if (!response.ok) {
                throw new Error(`Discord API responded with status: ${response.status}`);
            }

            this.logger.info('Test suite report sent to Discord', {
                timestamp: new Date().toLocaleString(),
                totalTests,
                failedTests,
                passedTests,
                pendingTests
            });
        } catch (error) {
            this.logger.error('Failed to send test report to Discord', {
                error: error.message,
                timestamp: new Date().toLocaleString()
            });
        }
    }
}

export default new DiscordReporter();
