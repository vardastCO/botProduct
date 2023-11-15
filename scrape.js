const puppeteer = require('puppeteer');


const { Client } = require('pg');
const cron = require('node-cron');


const pool = new Client({
  user: 'root',
  host: 'postgres', // Use the service name defined in docker-compose.yml
  database: 'root', // This should match the POSTGRES_DB in docker-compose.yml
  password: 'root',
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


            console.log('hi')
            // await processPage(currentHref,browser);
         
       
      } catch (error) {
        console.error(error);
      }
    });
  } catch (error) {
    console.error(error);
  }
}

main();