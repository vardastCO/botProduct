const puppeteer = require('puppeteer');


const { Client } = require('pg');
const cron = require('node-cron');

import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://api.vardast.com/graphql',
  cache: new InMemoryCache(),
});



const pool = new Client({
  user: 'user',
  host: 'postgres', // Use the service name defined in docker-compose.yml
  database: 'price', // This should match the POSTGRES_DB in docker-compose.yml
  password: 'password',
  port: 5432,
});

let browser;

async function createBrowser() {
  try {
    // const proxyServer = 'ss://YWVzLTI1Ni1nY206d0DVaGt6WGpjRA==@38.54.13.15:31214#main';
    browser = await puppeteer.launch({
       headless: true, // Set to true for headless mode, false for non-headless
       executablePath:  process.env.NODE_ENV === "production" ?
         process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
       args: [
           '--no-sandbox',
           '--disable-setuid-sandbox'
       ],
   });

 
   return browser;


  } catch (error) {
    console.error('Error while launching the browser:', error);
  }

}


async function processPage(pageUrl, browser) {
  const page = await browser.newPage();

  try {
    console.log('pageurl', pageUrl);

    // await page.goto(pageUrl, { timeout: 30000 });

    
        
   
  } catch (error) {
    console.error(error);
  } finally {

    
    await page.close();
  

   }
  
}
async function main() {
  await createBrowser();
  await pool.connect();
  try {;

    cron.schedule('* * * * *', async () => {
      try {
        let offset = 0;
        let batchNumber = 1;

        // Get the total count of logs
        const totalCount = await db.one('SELECT COUNT(*) FROM bot_price', [], a => +a.count);

        while (offset < totalCount) {
            // Retrieve logs from the 'logs' table in batches
            const logs = await db.any(`SELECT * FROM bot_price ORDER BY id OFFSET $1 LIMIT $2`, [offset, batchSize]);

            // Process each log batch
            console.log(`Batch ${batchNumber}:`);
            logs.forEach(log => {
                // Process each log (replace this with your logic)
                console.log(`ID: ${log.id}, Timestamp: ${log.timestamp}, Message: ${log.message}`);
            });

            // Update offset for the next batch
            offset += batchSize;
            batchNumber++;
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Close the database connection
        pgp.end();
    }
    });
  } catch (error) {
    console.error(error);
  }
}

main();