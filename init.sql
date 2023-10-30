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
    name TEXT,
    name2 TEXT,
    SKU TEXT,
    brand TEXT,
    category TEXT,
    description TEXT,
    url TEXT UNIQUE,
    price TEXT
);
