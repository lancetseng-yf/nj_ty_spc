Write-Host "Stopping TY Data Visualization (Node.js processes)..."

# Find and kill node.exe processes
# Note: This kills ALL node.exe processes. If you have other node apps running, be careful.
# A more specific filter would look for the command line, but Get-WmiObject can be slow/complex.
# For a devoted dev environment often just killing node is acceptable.

$process = Get-Process node -ErrorAction SilentlyContinue

if ($process) {
    $process | Stop-Process -Force
    Write-Host "Stopped $($process.Count) Node.js process(es)."
} else {
    Write-Host "No Node.js process found."
}
