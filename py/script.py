
import psutil  # For memory monitoring
from telegram import Bot
from telegram.error import TelegramError
import asyncio
import time
import subprocess  # Import the subprocess module

bot_token = '6918624503:AAFSU4bwTBmAa2w2T7ElJ9fY4XlUA6MaQ4Q'

# Chat ID (can be a group or your user ID)
chat_id = '1839030' 

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

if __name__ == "__main":
    max_retries = 3  # Adjust the maximum number of retry attempts
    retry_delay = 10  # Adjust the delay (in seconds) between retries
    retry_count = 0

    while retry_count < max_retries:
        ram_threshold = 60  # Adjust the threshold as needed
        ram_usage = get_ram_usage()

        if ram_usage >= ram_threshold:
            message = f"High RAM usage alert! RAM usage is {ram_usage}%."
            asyncio.run(send_message(message))
            
            # Restart all Docker containers
            try:
                subprocess.run(["docker", "restart", "$(docker ps -q)"])
                print(f"Docker Restart Output")
            except subprocess.CalledProcessError as e:
                print(f"Failed to restart Docker containers: {e}")
            
            break  # Alert sent successfully, Docker containers restarted, exit the loop

        retry_count += 1
        if retry_count < max_retries:
            # Wait for the specified delay before retrying
            time.sleep(retry_delay)

    # After the memory check loop, you can call the memory usage function
    asyncio.run(send_memory_usage())
