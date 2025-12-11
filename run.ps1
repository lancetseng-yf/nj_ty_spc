# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}

# Start the application
Write-Host "Starting TY Data Visualization..."
npm start
