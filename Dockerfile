FROM ghcr.io/puppeteer/puppeteer:19.7.2
RUN groupadd -r mygroup && useradd -r -g mygroup myuser

# Set the working directory and user for subsequent commands
WORKDIR /usr/src/app
USER myuser

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true \ 
   PUPPETEER_EXECUTABLE_PATH = /usr/bin/google-chrome-stable



# RUN mkdir pic 
RUN mkdir pic && chmod 777 pic

COPY . .

RUN npm install

# Expose port 3002 for your Node.js application.
EXPOSE 3002

# Start your Node.js application.
CMD ["node", "scrape.js"]
