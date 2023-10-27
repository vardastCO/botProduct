#!/bin/bash

# Set the memory limit threshold in bytes (9 GB in bytes)
MEMORY_LIMIT=9663676416

# Function to check and restart containers if memory threshold is exceeded
check_and_restart_containers() {
  TOTAL_MEMORY_USAGE=0
  CONTAINER_IDS=$(docker ps --filter "name=node-app" -q)

  for CONTAINER_ID in $CONTAINER_IDS; do
    MEMORY_USAGE=$(docker stats --no-stream --format "{{.MemUsage}}" "$CONTAINER_ID" | sed 's/MiB//')
    MEMORY_USAGE_BYTES=$(echo "$MEMORY_USAGE * 1024 * 1024" | bc)
    TOTAL_MEMORY_USAGE=$((TOTAL_MEMORY_USAGE + MEMORY_USAGE_BYTES))
  done

  if [ "$TOTAL_MEMORY_USAGE" -gt "$MEMORY_LIMIT" ]; then
    echo "Total memory usage of all node-app containers exceeds the limit. Restarting containers."

    # Restart all node-app containers
    for CONTAINER_ID in $CONTAINER_IDS; do
      docker restart "$CONTAINER_ID"
    done
  fi
}

# Main entry point of the script
check_and_restart_containers

# Start your application, you can replace the following with your application's entry command
exec "$@"
