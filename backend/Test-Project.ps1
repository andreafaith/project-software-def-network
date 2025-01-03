# Test-Project.ps1
param(
    [Parameter()]
    [ValidateSet('watch', 'coverage', 'verbose', 'default')]
    [string]$Mode = 'default'
)

Write-Host "Running Project Eye Tests..." -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Set environment variables if needed
$env:NODE_ENV = "test"

# Run the tests with different options based on arguments
switch ($Mode) {
    'watch' {
        Write-Host "Running tests in watch mode..." -ForegroundColor Green
        node --experimental-vm-modules node_modules/jest/bin/jest.js --watch --detectOpenHandles
    }
    'coverage' {
        Write-Host "Running tests with coverage..." -ForegroundColor Green
        node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage --detectOpenHandles
    }
    'verbose' {
        Write-Host "Running tests in verbose mode..." -ForegroundColor Green
        node --experimental-vm-modules node_modules/jest/bin/jest.js --verbose --detectOpenHandles
    }
    default {
        Write-Host "Running all tests..." -ForegroundColor Green
        node --experimental-vm-modules node_modules/jest/bin/jest.js --detectOpenHandles
    }
}

# Check if tests failed
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nTests failed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`nAll tests completed successfully!" -ForegroundColor Green
    exit 0
}
