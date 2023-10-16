# Use the Puppeteer base image
FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Set the working directory for your application
WORKDIR /usr/src/app

# We don't need the standalone Chromium (correct ENV syntax)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/google-chrome-stable

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose port 3002 for your Node.js application
EXPOSE 3002

# Make your script executable
RUN chmod +x scrape.js

# Change the CMD to run your desired Node.js script
CMD ["./scrape.js"]
