CREATE TABLE bot_price (
    id SERIAL PRIMARY KEY,
    sellerid INT,
    productid INT,
    url TEXT,
    price_xpath TEXT,
    price_xpath namev,
    price_xpath name,
    currency BOOLEAN DEFAULT false  
);
