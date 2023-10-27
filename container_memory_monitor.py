import docker
import psutil

# Initialize Docker client
client = docker.from_env()

# Define the memory threshold in bytes (e.g., 8GB)
memory_threshold = 9 * 1024 * 1024 * 1024

# Get a list of all running containers
containers = client.containers.list()

# Iterate through containers and check memory usage
for container in containers:
    stats = container.stats(stream=False)
    memory_usage = stats['memory_stats']['usage']

    if memory_usage > memory_threshold:
        # Container memory usage exceeds the threshold, restart it
        container.restart()
