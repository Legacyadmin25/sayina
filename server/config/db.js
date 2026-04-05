const knex = require('knex');
const { knexSnakeCaseMappers } = require('objection');
require('dotenv').config();

// Database configuration
const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'sayina',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: '../migrations'
  },
  seeds: {
    directory: '../seeds'
  },
  ...knexSnakeCaseMappers()
};

// Initialize Knex instance
const db = knex(dbConfig);

// Helper functions
const executeTransaction = async (callback) => {
  return db.transaction(callback);
};

// Check if a table exists
const tableExists = async (tableName) => {
  return db.schema.hasTable(tableName);
};

// Create a table if it doesn't exist
const createTableIfNotExists = async (tableName, tableBuilder) => {
  const exists = await tableExists(tableName);
  if (!exists) {
    return db.schema.createTable(tableName, tableBuilder);
  }
  return Promise.resolve();
};

// Utility function to check database connection
const checkConnection = async () => {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

module.exports = {
  db,
  executeTransaction,
  tableExists,
  createTableIfNotExists,
  checkConnection
};
