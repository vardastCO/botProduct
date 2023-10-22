const puppeteer = require('puppeteer-core');
const { Client } = require('pg');
const cron = require('node-cron');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const Minio = require('minio');
const genericPool = require('generic-pool');

const minioClient = new Minio.Client({
  endPoint: 'storage', // Use the service name defined in your Docker Compose file
  port: 9000,
  useSSL: false,
  accessKey: 'ndp', // Use the access key defined in your Docker Compose file
  secretKey: 'str0ngP@ss', // Use the secret key defined in your Docker Compose file
});

let browser = null;
let pool = null;

const initialPage = 'https://kashiland.com/store';
const startUrlPattern2 = 'https://kashiland.com/store/prod';

const initializeBrowser = async () => {
  // Initialize the browser and pool only once
  if (!browser) {
    const browserFactory = {
      create: async () => {
        const instance = await puppeteer.launch({
          headless: true,
          executablePath: '/usr/bin/google-chrome-stable',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
          ],
        });
        return instance;
      },
      destroy: (instance) => {
        instance.close();
      },
    };

    browser = await genericPool.createPool(browserFactory, {
      max: 25,
    });
  }

  if (!pool) {
    pool = new Client({
      user: 'db',
      host: 'postgres', // Use the service name defined in docker-compose.yml
      database: 'mydb', // This should match the POSTGRES_DB in docker-compose.yml
      password: 'root',
      port: 5432,
      max: 25, // Maximum number of connections in the pool
    });
    await pool.connect();
  }
 
};

const acquireBrowser = async () => {
  await initializeBrowser();
  return browser.acquire();
};

const releaseBrowser = async (instance) => {
  await browser.release(instance);
};




async function processPage(pageUrl,browser) {

  const page = await browser.newPage();
  
  try {
    await page.goto(pageUrl, { timeout: 300000 });
    const uuid1 = uuidv4();
    const [priceElement, nameElement, brandElement, categoryElemt] = await Promise.all([
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[2]/div[2]/div[2]/div[1]/div[3]/div/div[1]/div[1]/span[2]'),
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[1]/div/div/h1'),
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[2]/ul/li[2]/a'),
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[2]/ul/li[1]/a'),
    ]);

    const priceText = priceElement.length > 0 ? await page.evaluate((el) => el.textContent, priceElement[0]) : '';
    const nameText = nameElement.length > 0 ? await page.evaluate((el) => el.textContent, nameElement[0]) : '';
    const brandText = brandElement.length > 0 ? await page.evaluate((el) => el.textContent, brandElement[0]) : '';
    const categoryText = categoryElemt.length > 0 ? await page.evaluate((el) => el.textContent, categoryElemt[0]) : '';

    if (nameElement.length > 0) {
      const listXPath = '/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[2]/div/ul';
      const listData = await page.evaluate((listXPath) => {
        const list = document.evaluate(listXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const data = {};

        if (list) {
          const items = list.getElementsByTagName('li');
          for (const item of items) {
            const parts = item.textContent.split(':');
            if (parts.length === 2) {
              const key = parts[0].trim();
              const value = parts[1].trim();
              data[key] = value;
            }
          }
        }

        return data;
      }, listXPath);

      // Create a single string with the formatted data
      const formattedListData = Object.keys(listData)
        .map((key) => `${key}: ${listData[key]}`)
        .join('\n');

      const [imageElement] = await page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[1]/div/div/div/div[1]/div[1]/div[1]/a/figure/img');

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

      if (nameText.trim() !== '') {
        console.log('NAME:', nameText.trim(), 'PRICE:', priceText.trim(), 'URL:', pageUrl);
        await pool.query('INSERT INTO scraped_data(name, url, price, brand, SKU, description, category) VALUES($1, $2, $3, $4, $5, $6, $7)',
          [nameText.trim(), pageUrl, priceText.trim() ?? 0, brandText.trim() ?? '', uuid1, formattedListData, categoryText.trim() ?? '']);
      }
    }

    const hrefs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.map((link) => link.getAttribute('href'));
    });
    for (const href of hrefs) {
      try {
        if (href) { // Check if href is not null
          if (!href.startsWith('https://')) {
            var outputUrl = initialPage + href;
          } else {
            var outputUrl = href;
          }
          if (outputUrl && outputUrl.startsWith(startUrlPattern2)) {
            console.log(outputUrl, 'out');
            const urlCount = await pool.query('SELECT COUNT(*) FROM urls WHERE url = $1', [outputUrl]);
            const count = urlCount.rows[0].count;
            console.log(count, 'visitout');
            if (count === 0) {
              await pool.query('INSERT INTO urls(url, status) VALUES($1, $2)', [outputUrl, false]);
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    if (page) {
      await page.close();
    }
    releaseBrowser(browser);
  }
}

async function main() {
  try {
    // Define initialPage with the URL you want to start with
    // Initialize your database connection (e.g., 'pool') here.
    await pool.query('INSERT INTO urls(url, status) VALUES($1, $2)', [initialPage, false]);
    cron.schedule('* * * * *', async () => {
      try {
        console.log('hi bot');

        // Get the next unvisited URL
        const result = await pool.query('SELECT url FROM urls WHERE status = false LIMIT 1');
        console.log('result', result);
        const resultCount = result.rowCount;
        console.log('count result',resultCount) // Use rowCount to get the number of rows
        if (resultCount !== 0) {
          const url = result.rows[0].url;

          console.log('start urls',url)

          // Update the URL status to visited
          await pool.query('UPDATE urls SET status = true WHERE url = $1', [url]);
          await processPage(url,browser); // Call the processPage function
            
          
        }
      } catch (error) {
        console.error(error, 'error bot');
      } finally {
        console.log('end');
        // Close browser and database pool connections as needed
        // For example: await browser.close(); and await pool.end();
      }
    });
  } catch (error) {
    // console.error(error, 'rrrrrrrrrrr');
  }
}

initializeBrowser().then(() => {
  main();
});
