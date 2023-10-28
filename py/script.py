from telegram import Bot
from telegram.error import TelegramError
import asyncio
import time
import psutil
import os  # Import the os module

# Telegram Bot Token
bot_token = '6918624503:AAFSU4bwTBmAa2w2T7ElJ9fY4XlUA6MaQ4Q'

# Chat ID (can be a group or your user ID)
chat_id = '1839030'  # Replace with your actual chat ID

async def send_message(message):
    bot = Bot(token=bot_token)
    try:
        await bot.send_message(chat_id=chat_id, text=message)
    except TelegramError as e:
        # Handle the Telegram error, or you can log it
        print(f"Failed to send message: {e}")

def get_ram_usage():
    mem = psutil.virtual_memory()
    return mem.percent


async def send_memory_usage():
    ram_usage = get_ram_usage()
    message = f"Memory Usage is {ram_usage}%."
    await send_message(message)

if __name__ == "__main__":
    max_retries = 3  # Adjust the maximum number of retry attempts
    retry_delay = 10  # Adjust the delay (in seconds) between retries
    retry_count = 0

    while retry_count < max_retries:
        ram_threshold = 40  # Adjust the threshold as needed
        ram_usage = get_ram_usage()

        try:
            # Your code to monitor RAM usage goes here
            # Check if ram_usage >= ram_threshold

            if ram_usage >= ram_threshold:
                message = f"High RAM usage alert! RAM usage is {ram_usage}%."
                asyncio.run(send_message(message))
                running_containers = os.popen('docker ps -q').read().splitlines()
                if running_containers:
                    for container_id in running_containers:
                        # Restart each running container by ID
                        os.system(f'docker restart {container_id}')
                    print("Running Docker containers have been restarted.")
                else:
                    print("No running Docker containers to restart.")
                break  # Alert sent successfully, exit the loop

        except Exception as e:
            # Handle exceptions and log the error
            print(f"An error occurred: {str(e)}")
            # You can also log the error to a file if needed

        retry_count += 1
        if retry_count < max_retries:
            # Wait for the specified delay before retrying
            time.sleep(retry_delay)

    # After the memory check loop, you can call the memory usage function
    asyncio.run(send_memory_usage())
import os

def list_running_containers():
    try:
        # Run the "docker ps" command as a shell command
        result = os.popen('docker ps').read()
        print("Running Containers:")
        print(result)
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    list_running_containers()
