CREATE TABLE bot_price (
    id SERIAL PRIMARY KEY,
    sellerid INT,
    productid INT,
    url TEXT,
    price_xpath TEXT,
    namev TEXT,
    name TEXT,
    sku TEXT,
    skuv TEXT,
    currency BOOLEAN DEFAULT false  
);


