const puppeteer = require('puppeteer');


const { Client } = require('pg');
const cron = require('node-cron');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const Minio = require('minio');

const os = require('os');



const minioClient = new Minio.Client({
  endPoint: 'storage', // Use the service name defined in your Docker Compose file
  port: 9000,
  useSSL: false,
  accessKey: 'ndp', // Use the access key defined in your Docker Compose file
  secretKey: 'str0ngP@ss', // Use the secret key defined in your Docker Compose file
});

const pool = new Client({
  user: 'db',
  host: 'postgres', // Use the service name defined in docker-compose.yml
  database: 'mydb', // This should match the POSTGRES_DB in docker-compose.yml
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
const startUrlPattern2 = 'https://alton-home.com/';
const initialPage = 'https://alton-home.com/shop/?product_per_page=-1';


async function processPage(pageUrl,browser) {
  
  const page = await browser.newPage();
  await page.goto(pageUrl, { timeout: 120000 });
  try {
    const uuidWithHyphens = uuidv4();

// Remove hyphens from the UUID
      const uuid1 = uuidWithHyphens.replace(/-/g, '');
    if (pageUrl.includes('product')){
      const [ nameElement, brandElement,nameElement2,priceElemt] = await Promise.all([
        page.$x('/html/body/div[3]/div[2]/div/main/div[2]/div[1]/div[2]/h1'),
        page.$x('/html/body/div[3]/div[2]/div/main/div[2]/div[1]/div[2]/div[5]/span[2]/a[1]'),
        page.$x('/html/body/div[3]/div[2]/div/main/div[2]/div[2]/div[1]'),
        page.$x('/html/body/div[3]/div[2]/div/main/div[2]/div[1]/div[2]/p/span/bdi'),
      
      ]);
  
      if (nameElement.length > 0 ) {
        console.log('hi666')
        const [ nameText, brandText,nameText2,priceText] = await Promise.all([

          page.evaluate((el) => el.textContent, nameElement[0]),
          page.evaluate((el) => el.textContent, brandElement[0]),
          page.evaluate((el) => el.textContent, nameElement2[0]),
          page.evaluate((el) => el.textContent, priceElemt[0]),
        ]);
  
        
        if (nameText.trim() !== '' ) {
          const tableXPath = '/html/body/div[3]/div[2]/div/main/div[2]/div[2]/div[2]/table/tbody';
  
          const tableData = await page.evaluate((tableXPath) => {
            const table = document.evaluate(tableXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const data = {};
            console.log('by table ......................')
    
            if (table) {
              console.log('hi table ...............')
              const rows = table.getElementsByTagName('tr');
              for (const row of rows) {
                const cells = row.getElementsByTagName('td');
                if (cells.length === 2) {
                  const key = cells[0].textContent.trim();
                  const value = cells[1].textContent.trim();
                  data[key] = value;
                }
              }
            }
            return data;
          }, tableXPath);
    
          // Create a single string with the formatted data
          const formattedTableData = Object.keys(tableData)
            .map((key) => `${key}: ${tableData[key]}`)
            .join('\n');
    
    
          const [imageElement] = await page.$x('/html/body/div[3]/div[2]/div/main/div[2]/div[1]/div[1]/div/figure/div[1]/a/img');
      
          if (imageElement) {
            const imageUrl = await imageElement.evaluate((img) => img.src);
            const response = await fetch(imageUrl);
    
            if (response.ok && uuid1) {
              const buffer = await response.buffer();
              const localFilename = `${uuid1}.jpg`;
    
              // Upload the image to Minio
              const bucketName = 'vardast'; // Replace with your Minio bucket name
              const objectName = localFilename;
    
              try {
                 await minioClient.putObject(bucketName, objectName, buffer, buffer.length);
                console.log(`Image uploaded to Minio: ${objectName}`);
              } catch (error) {
                console.error(`Failed to upload image to Minio: ${error}`);
              }
            } else {
              console.error(`Failed to download image: ${imageUrl}`);
            }
          } else {
            console.log('No imageElement found on the page.');
          }
          console.log('NAME:', nameText.trim(), 'PRICE:', '', 'URL:', pageUrl);
          await pool.query('INSERT INTO scraped_data(name, url, price, brand, SKU,description,name2) VALUES($1, $2, $3, $4, $5,$6,$7)',
            [nameText.trim(), pageUrl, priceText.trim() ?? 0, brandText.trim() ?? '', uuid1,
          formattedTableData,nameText2]);
        }
      }
    }
  

  } catch (error) {
    console.error(error);
  } finally {
    const hrefs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.map((link) => link.getAttribute('href'));
    });
    for (const href of hrefs) {
      try {
        if (href) { // Check if href is not null
          if (!href.startsWith('https://')) {
            var outputUrl =  false;
          } else {
            var outputUrl = href;
          }
          if (outputUrl && outputUrl.startsWith(startUrlPattern2)  ) {
            const result = await pool.query('SELECT * FROM unvisited WHERE url = $1', [outputUrl]);
            if (result.rows.length === 0) {
              await pool.query('INSERT INTO unvisited(url) VALUES($1)', [outputUrl]);
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
    await page.close();
  }
}

async function main() {
  try {;

    await createBrowser();
    await pool.connect();
        // await pool.query('INSERT INTO unvisited(url) VALUES($1)', [initialPage]);
    cron.schedule('*/4 * * * *', async () => {
      try {
   
        const freeMemoryGB = os.freemem() / (1024 * 1024 * 1024);
   
        // let cpuUsage = osUtils.cpuUsage(function (cpuUsage) {
        //   return cpuUsage ;
        // });
        console.log('hi1')
        console.log('free',freeMemoryGB)
        if (freeMemoryGB > 3) {
          console.log('hi2')
          let currentHref = await pool.query('SELECT url FROM unvisited ORDER BY RANDOM() LIMIT 1');

          let visitedCount = 0;
  
          if (currentHref.rows.length > 0) {
            console.log('h3')
            const visitedCheckResult = await pool.query('SELECT COUNT(*) FROM visited WHERE url = $1', [currentHref.rows[0].url]);
            visitedCount = visitedCheckResult.rows[0].count;
            currentHref = currentHref.rows[0].url;
          } else {
            currentHref = initialPage;
          }
  
          if (visitedCount == 0) {
            console.log('hi4')
            await pool.query('DELETE FROM unvisited WHERE url = $1', [currentHref]);
            await pool.query('INSERT INTO visited(url) VALUES($1)', [currentHref]);
  
            const randomDelay = Math.floor(Math.random() * 120000); // 0 to 50 seconds
            await new Promise((resolve) => setTimeout(resolve, randomDelay));
  
        
            await processPage(currentHref,browser);
          } else {
            await pool.query('DELETE FROM unvisited WHERE url = $1', [currentHref]);
          }
        } else{
          console.log('high pressure on server')
        }
       
      } catch (error) {
        console.error(error);
      }
    });
  } catch (error) {
    console.error(error);
  }
}

main();