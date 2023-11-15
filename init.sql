CREATE TABLE visited (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE
);

CREATE TABLE unvisited (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE
);

CREATE TABLE scraped_data (
    id SERIAL PRIMARY KEY,
    name TEXT
);


CREATE TABLE bot_price (
    id SERIAL PRIMARY KEY,
    selLer_id INT,
    product_id INT,
    url TEXT,
    price_xpath TEXT,

);
