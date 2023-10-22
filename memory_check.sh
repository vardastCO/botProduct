#!/bin/bash

# Set the memory threshold to 300 megabytes in bytes
MEMORY_THRESHOLD=524288000 

# Get the memory usage of the container
MEMORY_USAGE=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes)

# Compare memory usage to the threshold
if [ "$MEMORY_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
   exit 1  # Unhealthy
else
   exit 0  # Healthy
fi
