# Configuration
$ServerIp = "10.76.203.40"
$User = "ftcuser"
$RemotePath = "/home/ftcuser/app/ty-data-visualization"
$TarFile = "ty-data-visualization.tar"
# Optional: Set path to private key for passwordless login (e.g., "C:\Users\FTC-User\.ssh\id_rsa")
$IdentityFile = "" 

# Build SSH options
$SshOptions = ""
if ($IdentityFile -ne "" -and (Test-Path $IdentityFile)) {
    $SshOptions = "-i `"$IdentityFile`""
}

try {
    # 0. Stop Existing Service (Optional)
    Write-Host "Step 0: Stopping existing service (if running)..." -ForegroundColor Cyan
    # Try to execute stop.sh on the server. Ignore errors if file doesn't exist (first run).
    ssh $SshOptions "$User@$ServerIp" "[ -f $RemotePath/stop.sh ] && bash $RemotePath/stop.sh || echo 'No existing service found or stop.sh missing.'"

    # 1. Package Project
    Write-Host "Step 1: Packaging project..." -ForegroundColor Cyan
    # Note: Including node_modules for offline deployment.
    tar -cf $TarFile --exclude ".git" *
    
    if (-not (Test-Path $TarFile)) {
        throw "Failed to create tar file."
    }

    # 2. Check/Create Remote Directory & Clean Old Tar
    Write-Host "Step 2: Preparing remote directory..." -ForegroundColor Cyan
    # mkdir -p ensures dir exists. rm -f deletes old tar to ensure fresh upload.
    ssh $SshOptions "$User@$ServerIp" "mkdir -p $RemotePath && rm -f $RemotePath/$TarFile"

    # 3. Upload File
    Write-Host "Step 3: Uploading $TarFile to $ServerIp..." -ForegroundColor Cyan
    scp $SshOptions $TarFile "$User@$($ServerIp):$RemotePath/"

    # 4. Extract and Start
    Write-Host "Step 4: Extracting files and Starting service..." -ForegroundColor Cyan
    # Skipped npm install as node_modules is included. Added bash run.sh to start service.
    ssh $SshOptions "$User@$ServerIp" "cd $RemotePath && tar -xf $TarFile && chmod +x run.sh stop.sh && nohup bash run.sh > /dev/null 2>&1 & echo 'Service Started.'"

    Write-Host "Deployment Completed Successfully!" -ForegroundColor Green

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
