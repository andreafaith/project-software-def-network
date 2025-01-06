import fetch from 'node-fetch';
import winston from 'winston';
import path from 'path';

class DiscordReporter {
    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1317893061828939846/UJO7IprHmd7PRMT8orXNW7YSk15cYIopV0Vjgr7aljUOPSWvNTgn1TyZTbEaSFi31gQF';
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
                            pendingTests++;
                            break;
                    }
                });
            });

            // Log test counts
            const logMessage = {
                level: 'info',
                message: 'Test suite report sent to Discord',
                timestamp: new Date().toLocaleString(),
                totalTests,
                passedTests,
                failedTests,
                pendingTests
            };
            console.log(JSON.stringify(logMessage));

            // Prepare the Discord message
            const message = {
                embeds: [{
                    title: '🧪 Test Results Report',
                    color: failedTests > 0 ? 0xFF0000 : 0x00FF00, // Red if failures, green if all passed
                    fields: [
                        {
                            name: 'Test Summary',
                            value: [
                                `Total Tests: ${totalTests}`,
                                `✅ Passed: ${passedTests}`,
                                `❌ Failed: ${failedTests}`,
                                `⏳ Pending: ${pendingTests}`
                            ].join('\n'),
                            inline: false
                        }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };

            // Add failure details if there are any
            if (failedTests > 0) {
                const failureDetails = [];
                testResult.testResults.forEach(suite => {
                    if (suite.failureMessage) {
                        // For suite-level failures
                        const relativePath = this.getRelativePath(suite.testFilePath);
                        failureDetails.push(`📁 ${relativePath}:\n${suite.failureMessage.split('\n')[0]}`);
                    } else {
                        // For individual test failures
                        suite.testResults.forEach(test => {
                            if (test.status === 'failed') {
                                failureDetails.push(`❌ ${test.fullName}:\n${test.failureMessages[0]}`);
                            }
                        });
                    }
                });

                if (failureDetails.length > 0) {
                    message.embeds[0].fields.push({
                        name: 'Failure Details',
                        value: failureDetails.slice(0, 3).join('\n\n') + 
                               (failureDetails.length > 3 ? '\n...(more failures not shown)' : ''),
                        inline: false
                    });
                }
            }

            // Send the report to Discord
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message)
            });

            if (!response.ok) {
                throw new Error(`Discord API responded with status ${response.status}`);
            }

        } catch (error) {
            this.logger.error('Failed to send test report to Discord:', error);
        }
    }
}

export default new DiscordReporter();
