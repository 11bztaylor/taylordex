const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://taylordex:taylordex_secure_pass@postgres:5432/taylordex',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
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
      console.log('Creating database schema...');
      const fs = require('fs');
      const path = require('path');
      const schema = fs.readFileSync(
        path.join(__dirname, 'schema.sql'), 
        'utf8'
      );
      
      await pool.query(schema);
      console.log('Database schema created successfully');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

module.exports = {
  query,
  pool,
  initializeDatabase
};
