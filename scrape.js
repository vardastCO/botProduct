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
function extractData() {
  var extractedData = {};

  // Access various elements within the table using querySelector
  const tradeNameElement = document.querySelector("#LName");
  extractedData.tradeName = tradeNameElement ? tradeNameElement.textContent : null;

  const activityElement = document.querySelector("#LActivity");
  extractedData.activity = activityElement ? activityElement.textContent : null;

  const addressElement = document.querySelector("#LAddr");
  extractedData.address = addressElement ? addressElement.textContent : null;

  const phoneElement = document.querySelector("#LPhones");
  extractedData.phone = phoneElement ? phoneElement.textContent : null;

  const faxElement = document.querySelector("#LFax");
  extractedData.fax = faxElement ? faxElement.textContent : null;

  const factoryAddressElement = document.querySelector("#LAddr1");
  extractedData.factoryAddress = factoryAddressElement ? factoryAddressElement.textContent : null;

  const factoryPhoneElement = document.querySelector("#LPhones1");
  extractedData.factoryPhone = factoryPhoneElement ? factoryPhoneElement.textContent : null;

  const factoryFaxElement = document.querySelector("#LFax1");
  extractedData.factoryFax = factoryFaxElement ? factoryFaxElement.textContent : null;

  const emailElement = document.querySelector("#LEMail");
  extractedData.email = emailElement ? emailElement.textContent : null;

  const websiteElement = document.querySelector("#LWebSite");
  extractedData.website = websiteElement ? websiteElement.textContent : null;

  // Return the extracted data object
  return extractedData;
}
const minioClient = new Minio.Client({
  endPoint: 'storage', // Use the service name defined in your Docker Compose file
  port: 9000,
  useSSL: false,
  accessKey: 'ndp', // Use the access key defined in your Docker Compose file
  secretKey: 'str0ngP@ss', // Use the secret key defined in your Docker Compose file
});

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
const startUrlPattern2 = 'http://marja.ir/Search.aspx?t=3';
const initialPage = 'http://marja.ir/Project.aspx?t=3';


async function processPage(pageUrl, browser) {
  const page = await browser.newPage();

  try {
    console.log('pageurl', pageUrl);

    await page.goto(pageUrl, { timeout: 30000 });

    // const hrefs = await page.evaluate(() => {
    //   const links = Array.from(document.querySelectorAll('a'));
    //   return links.map((link) => link.getAttribute('href'));
    // });
    // for (const href of hrefs) {
    //   try {
    //     if (href ) { // Check if href is not null
    //       // if (href.startsWith('htt')) {
    //       //   var outputUrl =  false;
    //       // } else {
    //         // console.log('href',href)
    //         var outputUrl = 'http://marja.ir/' + href;
    //         // console.log(outputUrl,'outputUrl')
    //       // }
    //       if (outputUrl  ) {
    //         const result = await pool.query('SELECT * FROM unvisited WHERE url = $1', [outputUrl]);
    //         if (result.rows.length === 0) {
    //           await pool.query('INSERT INTO unvisited(url) VALUES($1)', [outputUrl]);
    //         }
    //       }
    //     }
    //   } catch (error) {
    //     console.error(error);
    //   }
    // }

    // Wait for the elements to be available on the page
    // await page.waitForSelector('.class1');

    // Use page.evaluate to run JavaScript in the context of the page
    const hrefss = await page.evaluate(() => {
      var elements = document.querySelectorAll('.class1');
      var hrefArray = [];

      // Iterate through elements
      elements.forEach((element) => {
        console.log('ell',element)
        // Click the element
        element.click();

        // Extract and log the href value after the click event
        var hrefValue = element.getAttribute('href');
        console.log(hrefValue,'lllllll');

        console.log('ell333',hrefValue)

        // Save hrefValue to the array
        hrefArray.push(hrefValue);

        // Go back to the previous page
        window.history.back();
      });

      return hrefArray;
    });

    console.log('farrrbooood',hrefss);

    
  } catch (error) {
    console.error(error);
  } finally {
    console.log('fffffinal')
    
    await page.close();
  

   }
  
}
async function main() {
  await createBrowser();
  await pool.connect();
  try {;

 
    console.log('dd')
      await pool.query('INSERT INTO unvisited(url) VALUES($1)', [initialPage]);
  }catch(e){

  }
  try {;

 
    console.log('dd22')

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