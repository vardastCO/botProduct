const puppeteer = require('puppeteer');
const { Client } = require('pg');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const Minio = require('minio');
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
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.NODE_ENV === "production" ?
        process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    return browser;
  } catch (error) {
    throw error;
  }
}
const initialPage = 'https://kashiland.com/store';
const startUrlPattern2 = 'https://kashiland.com/store/'
async function processPage(pageUrl) {
  
  const page = await browser.newPage();
  await page.goto(pageUrl, { timeout: 350000 });

  try {
    const uuid1 = uuidv4();
    const [priceElement, nameElement, brandElement] = await Promise.all([
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[2]/div[2]/div[2]/div[1]/div[3]/div/div[1]/div[1]/span[2]'),
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[1]/div/div/h1'),
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[2]/ul/li[2]/a'),
    ]);

    if (nameElement.length > 0) {
      const priceText = priceElement.length > 0 ? await page.evaluate((el) => el.textContent, priceElement[0]) : null;
      const nameText = nameElement.length > 0 ? await page.evaluate((el) => el.textContent, nameElement[0]) : null;
      const brandText = brandElement.length > 0 ? await page.evaluate((el) => el.textContent, brandElement[0]) : null;

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

      if (nameText && nameText.trim() !== '') {
        console.log('NAME:', nameText.trim(), 'PRICE:', priceText.trim(), 'URL:', pageUrl);
        await pool.query('INSERT INTO scraped_data(name, url, price, brand, SKU,description) VALUES($1, $2, $3, $4, $5,$6)',
          [nameText.trim(), pageUrl, priceText.trim() ?? 0, brandText.trim() ?? '', uuid1,
        formattedListData]);
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
  } catch (error) {
    console.error(error);
  } finally {
    await page.close();
  }
}

async function main() {
  try {
    await createBrowser();
    await pool.connect();

    cron.schedule('* * * * *', async () => {
      try {
        let currentHref = await pool.query('SELECT url FROM unvisited LIMIT 1');
        let visitedCount = 0;

        if (currentHref.rows.length > 0) {
          const visitedCheckResult = await pool.query('SELECT COUNT(*) FROM visited WHERE url = $1', [currentHref.rows[0].url]);
          visitedCount = visitedCheckResult.rows[0].count;
          currentHref = currentHref.rows[0].url;
        } else {
          currentHref = initialPage;
        }

        if (visitedCount == 0) {
          await pool.query('DELETE FROM unvisited WHERE url = $1', [currentHref]);
          await pool.query('INSERT INTO visited(url) VALUES($1)', [currentHref]);

          const pageForEvaluation = await browser.newPage();
          let retryCount = 0;
          const maxRetries = 10000;

          while (retryCount < maxRetries) {
            try {
              await processPage(currentHref);
              break;
            } catch (error) {
              if (error.name === 'TimeoutError') {
                retryCount++;
              }
            }
          }

          if (retryCount >= maxRetries) {
            await pageForEvaluation.close();
          }

          await pageForEvaluation.close();
        } else {
          await pool.query('DELETE FROM unvisited WHERE url = $1', [currentHref]);
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
