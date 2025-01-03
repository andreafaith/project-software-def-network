@echo off
echo Running Project Eye Tests...
echo ===========================

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

:: Set environment variables if needed
set NODE_ENV=test

:: Run the tests with different options based on arguments
if "%1"=="watch" (
    echo Running tests in watch mode...
    node --experimental-vm-modules node_modules/jest/bin/jest.js --watch --detectOpenHandles
) else if "%1"=="coverage" (
    echo Running tests with coverage...
    node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage --detectOpenHandles
) else if "%1"=="verbose" (
    echo Running tests in verbose mode...
    node --experimental-vm-modules node_modules/jest/bin/jest.js --verbose --detectOpenHandles
) else (
    echo Running all tests...
    node --experimental-vm-modules node_modules/jest/bin/jest.js --detectOpenHandles
)

:: Check if tests failed
if errorlevel 1 (
    echo.
    echo Tests failed!
    exit /b 1
) else (
    echo.
    echo All tests completed successfully!
    exit /b 0
)
