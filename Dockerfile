# Use the Puppeteer base image
FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Set the working directory for subsequent commands
WORKDIR /usr/src/app

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Create a 'pic' directory and change its permissions
RUN mkdir /usr/src/app/pic && chmod 777 /usr/src/app/pic

# Change the owner of the working directory to the 'node' user
RUN chown -R node:node /home/node/app

# Switch to the 'node' user
USER node

# Use an existing user (e.g., 'node') if available
# Replace 'node' with the name of an existing user in the base image
USER node

# Copy your application code into the container
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose port 3002 for your Node.js application
EXPOSE 3002

# Start your Node.js application
CMD ["node", "scrape.js"]
