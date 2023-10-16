# Use the Puppeteer base image
FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Set the working directory for subsequent commands
WORKDIR /usr/src/app

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Create a 'pic' directory and change its permissions
RUN mkdir pic && chmod 777 pic

# Use an existing group (e.g., 'users') if available
# Replace 'users' with the name of an existing group in the base image
RUN useradd -g users user

# Give the 'user' user permissions to the 'pic' directory
RUN chown -R user:user /usr/src/app/pic

# Switch to the 'user' user
USER user

# Copy your application code into the container
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose port 3002 for your Node.js application
EXPOSE 3002

# Start your Node.js application
CMD ["node", "scrape.js"]
