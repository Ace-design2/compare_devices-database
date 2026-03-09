-- database.sql

-- 1. Create the database (Run this first, then connect to the new database)
CREATE DATABASE device_compare;

-- 2. Connect to the device_compare database and run the following to create the table:
-- \c device_compare

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    price TEXT,
    specs JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
