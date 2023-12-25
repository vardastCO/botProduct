const puppeteer = require("puppeteer");

const { Client } = require("pg");
const cron = require("node-cron");
const { convertPersianToEnglish } = require("./utils");

const pool = new Client({
  user: "user",
  host: "postgres", // Use the service name defined in docker-compose.yml
  database: "price", // This should match the POSTGRES_DB in docker-compose.yml
  password: "password",
  port: 5432,
});

let browser;

async function createBrowser() {
  try {
    const proxyServer = 'ss://YWVzLTI1Ni1nY206d0DVaGt6WGpjRA==@38.54.13.15:31214#main';
    browser = await puppeteer.launch({
      headless: true, // Set to true for headless mode, false for non-headless
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
       args: ["--no-sandbox", "--disable-setuid-sandbox",`--proxy-server=${proxyServer}`,],
    });
   
    
    return browser;
  } catch (error) {
    console.error("Error while launching the browser:", error);
  }
}

async function processPage(
  pageUrl,
  browser,
  sellerid,
  productid,
  xpath,
  currency
) {
  const page = await browser.newPage();

  try {
    await page.goto(pageUrl, { timeout: 240000 });
    const [priceElement] = await page.$x(xpath);

    const [priceText] = await Promise.all([
      page.evaluate(
        (el) => el.textContent?.replace(/[^\u06F0-\u06F90-9]/g, ""),
        priceElement
      ),
    ]);

    let englishNumber = convertPersianToEnglish(priceText);

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

    let amount = currency
      ? parseInt(englishNumber.replace(/,/g, ""), 10) / 10
      : parseInt(englishNumber.replace(/,/g, ""), 10);


    db.one(createProductPriceQuery, [productid, sellerid, amount, true, 1])
      .then((result) => {
        console.log("Currect db job");
      })
      .catch((error) => {
        console.log("Error db: ", error);
      })
      .finally(() => {
        db.one(createProductOfferQuery, [productid, sellerid]);
      });
  } catch (error) {
    console.error(error);
  } finally {
    await page.close();
  }
}

const pgp = require("pg-promise")();
const db = pgp("postgres://postgres:vardast@1234@128.140.109.3:5432/vardast");

async function main() {
  await createBrowser();
  await pool.connect();
  try {
    // cron.schedule('0 0 * * *', async () => {
    try {
      const totalCountResult = await pool.query(
        "SELECT COUNT(*) FROM bot_price"
      );

      if (totalCountResult.rows.length > 0) {
        const totalCount = totalCountResult.rowCount;

        // const delay = getRandomDelay(1000, 9000); // Random delay between 1 to 3 seconds
        // await new Promise(resolve => setTimeout(resolve, delay));

        const logs = await pool.query(
          'SELECT * FROM bot_price ORDER BY RANDOM() LIMIT 1'
        );
        
        
        for (const log of logs.rows) {
          console.log(`Before process : ${log.url}`);
          await pool.query(`DELETE FROM bot_price WHERE id = $1`, [log.id]);
          // Process the page step by step
          if(log.price_xpath) {
            await processPage(
              log.url,
              browser,
              log.sellerid,
              log.productid,
              log.price_xpath,
              log.currency
            );
          }
          
        }
      } else {
        // await new Promise((resolve) => setTimeout(resolve, 300000));
        console.error("Error: Unable to retrieve total count.");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
    }
    // });
  } catch (error) {
    console.error(error);
  }
}
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
main();
