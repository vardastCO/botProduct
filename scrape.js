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
const startUrlPattern2 = 'https://www.kwciran.com/fa/product';
const initialPage = 'https://www.kwciran.com/fa/product';


async function processPage(pageUrl,browser) {
  
  const page = await browser.newPage();
  await page.goto(pageUrl, { timeout: 180000 });
  try {
    const uuidWithHyphens = uuidv4();

// Remove hyphens from the UUID
      const uuid1 = uuidWithHyphens.replace(/-/g, '');
    if (pageUrl.includes('product')){
      const [ categoryElemt,nameElement,nameElement2,priceElemt] = await Promise.all([

        page.$x('/html/body/main/div/div[1]/div[1]/div/div/div/ul'),
        page.$x('/html/body/main/div/div[1]/div[1]/div/div/div/h2'),
        page.$x('/html/body/main/div/div[3]/div/div/div[2]/div[1]/div/div[2]'),
        page.$x('/html/body/main/div/div[2]/div/div/div/div[2]/div/div[2]/div[2]/div[3]/div/span'),
      
      ]);
  
      if (nameElement.length > 0 ) {
        const [ categorytext,nameText,nameText2,priceText] = await Promise.all([
          page.evaluate((el) => el.textContent, categoryElemt[0]),
          page.evaluate((el) => el.textContent, nameElement[0]),
          page.evaluate((el) => el.textContent, nameElement2[0]),
          page.evaluate((el) => el.textContent, priceElemt[0]),
        ]);
  
        
        if (nameText.trim() !== '' ) {
          var ulElement = document.querySelector("ul.list-unstyled");
          var liElements = ulElement.querySelectorAll("li");
          var data = {};
          
          liElements.forEach(function(liElement) {
              var stlR = liElement.querySelector(".stl_r").textContent.trim();
              var stlL = liElement.querySelector(".stl_l").textContent.trim();
              data[stlR] = stlL;
          });
          
          // Format the data as a string
          const formattedTableData = Object.keys(data)
              .map((key) => `${key}: ${data[key]}`)
              .join('\n');
          

              const imageElementsXPath = '/html/body/main/div/div[2]/div/div/div/div[1]/div/div[1]//img';
              const imageElements = await page.$x(imageElementsXPath);
            
              if (imageElements.length > 0) {
                for (let i = 0; i < imageElements.length; i++) {
                  const imageElement = imageElements[i];
                  const imageUrl = await imageElement.evaluate((img) => img.src);
                  const response = await fetch(imageUrl);
            
                  if (response.ok && uuid1) {
                    const localFilename = `${uuid1}-${i}.jpg`; // Generate a unique filename for each image
                    const buffer = await response.buffer();
            
                    // Replace with your Minio client setup
          
            
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
                }
              } else {
                console.log('No imageElements found with the specified XPath.');
              }
            
          
          console.log('NAME:', nameText.trim(), 'PRICE:', '', 'URL:', pageUrl);
          await pool.query('INSERT INTO scraped_data(name, url, price, brand, SKU,description,name2,category) VALUES($1, $2, $3, $4, $5,$6,$7,$8)',
            [nameText.trim(), pageUrl, priceText.trim() ?? 0, 'kwc', uuid1,
          formattedTableData,nameText2,categorytext.trim() ?? '']);
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
    cron.schedule('*/5 * * * *', async () => {
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