const fs = require('fs').promises;
const path = require('path');
const { query } = require('./connection');

class DatabaseMigrator {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  async createMigrationsTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations() {
    const result = await query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure migrations run in order
    } catch (error) {
      console.log('No migrations directory found, creating...');
      await fs.mkdir(this.migrationsPath, { recursive: true });
      return [];
    }
  }

  async executeMigration(filename) {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = await fs.readFile(filePath, 'utf8');
    
    console.log(`🔄 Executing migration: ${filename}`);
    
    try {
      // Execute the migration SQL
      await query(sql);
      
      // Record that this migration has been executed
      await query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      console.log(`✅ Migration completed: ${filename}`);
      return true;
    } catch (error) {
      console.error(`❌ Migration failed: ${filename}`);
      console.error('Error:', error.message);
      throw error;
    }
  }

  async runMigrations() {
    console.log('🚀 Starting database migrations...');
    
    // Ensure migrations table exists
    await this.createMigrationsTable();
    
    // Get list of executed migrations
    const executedMigrations = await this.getExecutedMigrations();
    
    // Get list of migration files
    const migrationFiles = await this.getMigrationFiles();
    
    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return true;
    }
    
    console.log(`📋 Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(file => console.log(`   - ${file}`));
    
    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }
    
    console.log('🎉 All migrations completed successfully!');
    return true;
  }

  async rollbackMigration(filename) {
    // Basic rollback - this would need to be enhanced with proper rollback scripts
    console.log(`⚠️  Rolling back migration: ${filename}`);
    
    await query(
      'DELETE FROM migrations WHERE filename = $1',
      [filename]
    );
    
    console.log(`✅ Migration rollback recorded: ${filename}`);
    console.log('⚠️  Note: You may need to manually undo database changes');
  }

  async getMigrationStatus() {
    await this.createMigrationsTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = await this.getMigrationFiles();
    
    console.log('\n📊 Migration Status:');
    console.log('==================');
    
    for (const migration of allMigrations) {
      const status = executedMigrations.includes(migration) ? '✅ Executed' : '⏳ Pending';
      console.log(`${status} - ${migration}`);
    }
    
    const pendingCount = allMigrations.length - executedMigrations.length;
    console.log(`\nTotal: ${allMigrations.length} migrations, ${pendingCount} pending`);
    
    return {
      total: allMigrations.length,
      executed: executedMigrations.length,
      pending: pendingCount,
      pendingMigrations: allMigrations.filter(m => !executedMigrations.includes(m))
    };
  }
}

module.exports = DatabaseMigrator;