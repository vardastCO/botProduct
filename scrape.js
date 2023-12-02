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


async function processPage(pageUrl, browser,sellerid,productid,xpath,currency) {
  const page = await browser.newPage();

  try {
    console.log('pageurl', pageUrl);
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.goto(pageUrl, { timeout: 1800000 });
    const [priceElement] = await page.$x(xpath);

    if (priceElement) {
      const [priceText] = await Promise.all([
        page.evaluate((el) => el.textContent, priceElement),
      ]);
      const createProductOfferQuery = `
      INSERT INTO product_offers ("productId", "sellerId")
      VALUES ($1, $2)
      RETURNING *;
      `;
  
      const createProductPriceQuery = `
      INSERT INTO product_prices ("productId", "sellerId" ,"amount"  ,"isPublic","createdById")
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *;
      `;
     // Execute the query
     
      let amount = currency ? parseInt(priceText.replace(/,/g, ''),10)/10 : parseInt(priceText.replace(/,/g, ''),10)
      db.one(createProductPriceQuery, [productid, sellerid,amount,true,1]).then(result => {
        db.one(createProductOfferQuery, [productid, sellerid])
        console.log('New product price created:', result);
      })
          
       
    } 
    
  } catch (error) {
    console.error(error);
  } finally {

    
    await page.close();
  

   }
  
}

const pgp = require('pg-promise')();
const db = pgp('postgres://postgres:vardast@1234@128.140.109.3:5432/vardast');

async function main() {
  await createBrowser();
  await pool.connect();
  try {;
    // cron.schedule('0 0 * * *', async () => {
      try {

        let offset = 0;
        let batchNumber = 1;
        const batchSize = 100; 

        const totalCountResult = await pool.query('SELECT COUNT(*) FROM bot_price');

        if (totalCountResult.rows.length > 0 ) {
      
            const totalCount = totalCountResult.rowCount;
            while (offset < totalCount) {
                // Retrieve logs from the 'bot_price' table in batches
                const logs = await pool.query(`SELECT * FROM bot_price ORDER BY id OFFSET $1 LIMIT $2`, [offset, batchSize]);

                for (const log of logs.rows) {
                  // Process each log (replace this with your logic)
                  console.log(`ID: ${log.url}`);
                  
                  // Process the page step by step
                  await processPage(log.url, browser, log.sellerid, log.productid, log.price_xpath, log.currency);
                  await pool.query(`DELETE FROM bot_price WHERE id = $1`, [log.id]);
              }
          
    
                // Update offset for the next batch
                offset += batchSize;
                batchNumber++;
            }
        } else {
          await new Promise(resolve => setTimeout(resolve, 300000));
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