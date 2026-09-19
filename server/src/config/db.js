require('dotenv').config();
const { Pool, types } = require('pg');

// Keep DATE columns as YYYY-MM-DD strings so timezones cannot shift the day.
types.setTypeParser(1082, (value) => value);
// Keep TIME columns as HH:MM:SS strings so timezones cannot shift the clock.
types.setTypeParser(1083, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;