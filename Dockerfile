# Use the Puppeteer base image
FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Create a working directory for your application
WORKDIR /home/node/app

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Create a 'pic' directory and change its permissions
RUN mkdir /home/node/app/pic && chmod 777 /home/node/app/pic

# Create a non-root user (e.g., 'node') and give it ownership of the working directory
RUN groupadd -r node && useradd -r -g node node
RUN chown -R node:node /home/node/app

# Switch to the 'node' user
USER node

# Copy your application code into the container
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose port 3002 for your Node.js application
EXPOSE 3002

# Start your Node.js application
CMD ["node", "scrape.js"]
