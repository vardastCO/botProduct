import docker

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
        print "Restarted container:", container.name

# List all Docker images
images = client.images.list()

# Calculate the total memory usage of all images
total_memory_usage = 0

for image in images:
    image_id = image.id
    image_info = client.images.get(image_id)
    image_size = image_info.attrs['Size']

    # Convert image size to bytes (remove 'B' from the size string)
    image_size_in_bytes = int(image_size[:-1])

    total_memory_usage += image_size_in_bytes

print "Total Memory Usage of All Images:", total_memory_usage, "bytes"

if total_memory_usage > memory_threshold:
    # Total memory usage of all images exceeds the threshold, restart containers
    for container in containers:
        container.restart()
        print "Restarted container:", container.name
