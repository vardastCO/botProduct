FROM ghcr.io/puppeteer/puppeteer:19.7.2
WORKDIR /usr/src/app

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true \ 
   PUPPETEER_EXECUTABLE_PATH = /usr/bin/google-chrome-stable



COPY . .


USER root

# Run the useradd command to add a new user.
RUN useradd -m user

# Switch back to the non-root user if necessary.
USER user

RUN chown -R user:user /usr/src/app/test

USER root

RUN npm install

# Expose port 3002 for your Node.js application.
EXPOSE 3002

# Start your Node.js application.
CMD ["node", "scrape.js"]
