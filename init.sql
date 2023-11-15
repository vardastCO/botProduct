CREATE TABLE bot_price (
    id SERIAL PRIMARY KEY,
    selLerid INT,
    productid INT,
    url TEXT,
    price_xpath TEXT
);
