#!/bin/bash

echo "Stopping TY Data Visualization..."

# Find the process ID of the node server (cross-platform compatible for unix-like shells)
# This works for 'node server.js'
pids=$(ps aux | grep "node server.js" | grep -v grep | awk '{print $2}')

if [ -z "$pids" ]; then
    echo "No 'node server.js' process found."
else
    for pid in $pids; do
        echo "Killing process $pid"
        kill -9 $pid
    done
    echo "Stopped."
fi
