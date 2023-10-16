# Use the Puppeteer base image
FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Create a new user "appuser" to run the application
RUN adduser -D -u 1001 -g 1001 -h /home/appuser appuser

# Set the working directory for your application
WORKDIR /usr/src/app

# We don't need the standalone Chromium (correct ENV syntax)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/google-chrome-stable

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Switch to the "appuser" to run the application
USER appuser

# Copy the rest of your application code
COPY . .

# Expose port 3002 for your Node.js application
EXPOSE 3002

# Start your Node.js application
CMD ["node", "scrape.js"]
