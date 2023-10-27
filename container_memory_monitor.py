import docker
import psutil

# Initialize Docker client
client = docker.from_env()

# Define the memory threshold in bytes (e.g., 9GB)
memory_threshold = 9 * 1024 * 1024 * 1024

# Get a list of all Docker images
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

# Print the total memory usage of all images
print(f"Total Memory Usage of All Images: {total_memory_usage} bytes")

if total_memory_usage > memory_threshold:
    # Total memory usage of all images exceeds the threshold, restart them
    for container in client.containers.list():
        container.restart()
