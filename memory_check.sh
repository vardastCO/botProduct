#!/bin/sh

# Set your memory threshold in bytes (e.g., 512MB)
MEMORY_THRESHOLD=536870912  # 512MB

# Get the memory usage of the container
MEMORY_USAGE=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes)

# Compare memory usage to the threshold
if [ "$MEMORY_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
   exit 1  # Unhealthy
else
   exit 0  # Healthy
fi
