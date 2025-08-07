const { Pool } = require('pg');
const logger = require('../utils/logger');

// Use individual connection parameters for better reliability
const dbConfig = {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'taylordx',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'taylordx',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Validate required environment variables
if (!dbConfig.password) {
  logger.error('Database password is required. Set POSTGRES_PASSWORD environment variable.', {}, 'database');
  process.exit(1);
}

logger.info('Database configuration loaded', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  passwordProvided: !!dbConfig.password
}, 'database');

const pool = new Pool(dbConfig);

// Track connection count to avoid spam
let connectionCount = 0;
pool.on('connect', () => {
  connectionCount++;
  // Only log first few connections and then every 10th
  if (connectionCount <= 3 || connectionCount % 10 === 0) {
    logger.info(`PostgreSQL pool connection #${connectionCount}`, {}, 'database');
  }
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message, code: err.code }, 'database');
  process.exit(-1);
});

async function initializeDatabase() {
  try {
    const tablesExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'services'
      );
    `);

    if (!tablesExist.rows[0].exists) {
      logger.info('Creating database schema', {}, 'database');
      const fs = require('fs');
      const path = require('path');
      const schema = fs.readFileSync(
        path.join(__dirname, 'schema.sql'), 
        'utf8'
      );
      
      await pool.query(schema);
      logger.info('Database schema created successfully', {}, 'database');
    }
  } catch (error) {
    logger.error('Error initializing database', { error: error.message, code: error.code }, 'database');
    throw error;
  }
}

async function query(text, params, retries = 3) {
  const start = Date.now();
  
  for (let i = 0; i < retries; i++) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Only log slow queries (>100ms) to reduce noise
      if (duration > 100) {
        logger.dbQuery({ text, params }, duration, null, { rows: res.rowCount });
      }
      
      return res;
    } catch (error) {
      const duration = Date.now() - start;
      
      // Retry on connection errors, but not on SQL errors
      if (i < retries - 1 && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
        logger.info(`Database query retry ${i + 1}/${retries}`, { error: error.message }, 'database');
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      
      // Log database errors
      logger.dbQuery({ text, params }, duration, error);
      throw error;
    }
  }
}

module.exports = {
  query,
  pool,
  initializeDatabase
};
