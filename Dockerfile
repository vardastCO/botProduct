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


RUN npm install --only=production

# Copy the rest of your application code
COPY . .

# Change the ownership to allow the non-root user to write to node_modules
RUN chown -R 777 /usr/src/app/node_modules

# Expose port 3002 for your Node.js application
EXPOSE 3002

# Change the CMD to run your desired Node.js script
CMD ["node","scrape.js"]
