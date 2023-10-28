import psutil  # For memory monitoring
from telegram import Bot
from telegram.error import TelegramError
import time

# Telegram Bot Token
bot_token = '6918624503:AAFSU4bwTBmAa2w2T7ElJ9fY4XlUA6MaQ4Q'

# Chat ID (can be a group or your user ID)
chat_id = '1839030' # Replace with your actual chat ID

def get_ram_usage():
    mem = psutil.virtual_memory()
    return mem.percent

def send_message(message):
    bot = Bot(token=bot_token)
    try:
        bot.send_message(chat_id=chat_id, text=message)
    except TelegramError as e:
        # Handle the Telegram error, or you can log it
        print(f"Failed to send message: {e)

def send_test_message():
    test_message = "This is a test message."
    send_message(test_message)

if __name__ == "__main__":
    max_retries = 3  # Adjust the maximum number of retry attempts
    retry_delay = 10  # Adjust the delay (in seconds) between retries
    retry_count = 0

    while retry_count < max_retries:
        ram_threshold = 90  # Adjust the threshold as needed
        ram_usage = get_ram_usage()

        if ram_usage >= ram_threshold:
            message = f"High RAM usage alert! RAM usage is {ram_usage}%."
            send_message(message)
            break  # Alert sent successfully, exit the loop

        retry_count += 1
        if retry_count < max_retries:
            # Wait for the specified delay before retrying
            time.sleep(retry_delay)

    # After the memory check loop, you can call the test message function
    send_test_message()
