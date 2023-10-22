CREATE TABLE urls (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE,
    status BOOLEAN DEFAULT FALSE
);

CREATE TABLE scraped_data (
    id SERIAL PRIMARY KEY,
    name TEXT,
    SKU TEXT,
    brand TEXT,
    category TEXT,
    description TEXT,
    url TEXT UNIQUE,
    price TEXT
);
