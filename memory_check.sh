#!/bin/sh

# Set your memory threshold to 10 gigabytes in bytes
MEMORY_THRESHOLD=$((10 * 1024 * 1024 * 1024))

# Get the memory usage of the container
MEMORY_USAGE=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes)

# Compare memory usage to the threshold
if [ "$MEMORY_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
   exit 1  # Unhealthy
else
   exit 0  # Healthy
fi
