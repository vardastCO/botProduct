const puppeteer = require('puppeteer');


const { Client } = require('pg');
const cron = require('node-cron');




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
  console.log('hiii')
  try {;
    console.log('hiii32323')
    // cron.schedule('* * * * *', async () => {
      try {
        console.log('hiii54345345')
        let offset = 0;
        let batchNumber = 1;
        const batchSize = 100; 

        const totalCountResult = await pool.query('SELECT COUNT(*) FROM bot_price');
        console.log('hiii',totalCountResult)
        if (totalCountResult.rows.length > 0 ) {
      
            const totalCount = totalCountResult.rowCount;
            console.log(offset,'ofset','total',totalCount)
            console.log('hiii23423434')
            while (offset < totalCount) {

              console.log(offset,'ofset','total',totalCount)
                // Retrieve logs from the 'bot_price' table in batches
                const logs = await pool.query(`SELECT * FROM bot_price ORDER BY id OFFSET $1 LIMIT $2`, [offset, batchSize]);
                console.log('logs',logs)
                // Process each log batch
                console.log(`Batch ${batchNumber}:`);
                logs.rows.forEach(log => {
                    // Process each log (replace this with your logic)
                    console.log(`ID: ${log.id}`);
                });
    
                // Update offset for the next batch
                offset += batchSize;
                batchNumber++;
            }
        } else {
            console.error('Error: Unable to retrieve total count.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {

    }
    
    
    // });
  } catch (error) {
    console.error(error);
  }
}

main();