const { Cluster } = require('puppeteer-cluster');
const { Client } = require('pg');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
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
  max: 25, // A
});

let browser;

async function createBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/google-chrome-stable',
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
const startUrlPattern2 = 'https://kashiland.com/store/prod';

async function processPage(page) {
  try {
    const pageUrl = await page.url();
    const uuid1 = uuidv4();
    const [priceElement, nameElement, brandElement, categoryElement] = await Promise.all([
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[2]/div[2]/div[2]/div[1]/div[3]/div/div[1]/div[1]/span[2]'),
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[1]/div/div/h1'),
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[2]/ul/li[2]/a'),
      page.$x('/html/body/form/div[3]/div/section/div[7]/div/div/div/div/div/div/div/div/div/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[2]/ul/li[1]/a'),
    ]);

    const priceText = priceElement.length > 0 ? await page.evaluate((el) => el.textContent, priceElement[0]) : '';
    const nameText = nameElement.length > 0 ? await page.evaluate((el) => el.textContent, nameElement[0]) : '';
    const brandText = brandElement.length > 0 ? await page.evaluate((el) => el.textContent, brandElement[0]) : '';
    const categoryText = categoryElement.length > 0 ? await page.evaluate((el) => el.textContent, categoryElement[0]) : '';

    if (pageUrl) {
      console.log('URL:', pageUrl);
      if (nameText.trim() !== '') {
        console.log('NAME:', nameText.trim(), 'PRICE:', priceText.trim());
        await pool.query('INSERT INTO scraped_data(name, url, price, brand, SKU, description, category) VALUES($1, $2, $3, $4, $5, $6, $7)',
          [nameText.trim(), pageUrl, priceText.trim() ?? 0, brandText.trim() ?? '', uuid1, formattedListData, categoryText.trim() ?? '']);
      }
    } else {
      console.error('No valid URL found on the page.');
    }
  } catch (error) {
    console.error(error);
  } finally {
    if (page) {
      await page.close();
    }
  }
}

async function main() {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_BROWSER,
    maxConcurrency: 20,
    puppeteerOptions: {
      headless: true,
      executablePath: '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ]
    }})
  ;

  cluster.queue(initialPage, (page) => processPage(page));

  cluster.on('taskerror', (err, data) => {
    console.error(`Error crawling ${data}: ${err.message}`);
  });

  await createBrowser();
  await pool.connect();

  cron.schedule('*/2 * * * *', async () => {
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

  await cluster.idle();
  await cluster.close();
}

main();
