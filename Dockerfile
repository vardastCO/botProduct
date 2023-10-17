# Use the Puppeteer base image
FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Set the working directory for your application
WORKDIR /usr/src/app

# We don't need the standalone Chromium (correct ENV syntax)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/google-chrome-stable

# Copy package.json and package-lock.json to the container


# Install Node.js dependencies
COPY . .

RUN mkdir ./node_modules && chmod -R 777 ./node_modules

RUN npm install 


# Expose port 3002 for your Node.js application
EXPOSE 3002

# Change the CMD to run your desired Node.js script
CMD ["node","scrape.js"]
