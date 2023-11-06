const puppeteer = require('puppeteer');


const { Client } = require('pg');
const cron = require('node-cron');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const Minio = require('minio');

const os = require('os');

const TelegramBot = require('node-telegram-bot-api');

const botToken = '6918624503:AAFSU4bwTBmAa2w2T7ElJ9fY4XlUA6MaQ4Q'; // Replace with your actual bot token

// Chat ID (can be a group or your user ID)
const chatId = '1839030'; // Replace with your actual chat ID

// Create a new Telegram bot instance
// const bot = new TelegramBot(botToken, { polling: true });

// function sendMessage(message) {
//   bot.sendMessage(chatId, message)
//     .then(() => {
//       console.log(`Message sent: ${message}`);
//     })
//     .catch((error) => {
//       console.error(`Failed to send message: ${error}`);
//     });
// }

// // Example usage:
// sendMessage('Hello, Telegram Bot!');

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
const startUrlPattern2 = 'http://marja.ir/Search.aspx?t=3';
const initialPage = 'http://marja.ir/Project.aspx?t=3';


async function processPage(pageUrl,browser) {
  
  const page = await browser.newPage();
  await page.goto(pageUrl, { timeout: 90000 });
  try {
    console.log('pageurl',pageUrl)
    
      
    await page.click('a.class1');

    // Wait for a certain element to load on the new page (adjust as needed)
    // Wait for a specific element on the new page to load (if necessary)
    await page.waitForSelector('#Table1');

    // Extract the data from the table
    const data = await page.evaluate(() => {
      const table = document.querySelector('#Table1');
      const rows = table.querySelectorAll('tr');
      const keyValuePairs = {};

      for (const row of rows) {
        const cells = row.querySelectorAll('td');

        if (cells.length === 4) {
          const key = cells[1].textContent.trim().replace(/:/, ''); // Extract and clean the key
          const value = cells[2].textContent.trim(); // Extract the value
          keyValuePairs[key] = value; // Store as key-value pair
        }
      }

      return keyValuePairs;
    });

    console.log(data);

    await pool.query('INSERT INTO scraped_data(name) VALUES($1)', [data]);
  

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
  await createBrowser();
  await pool.connect();
  try {;

 
    console.log('dd')
      // await pool.query('INSERT INTO unvisited(url) VALUES($1)', [initialPage]);
    cron.schedule('*/2 * * * *', async () => {
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
  
            // const randomDelay = Math.floor(Math.random() * 120000); // 0 to 50 seconds
            // await new Promise((resolve) => setTimeout(resolve, randomDelay));
  
        
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