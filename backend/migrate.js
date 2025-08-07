#!/usr/bin/env node

const DatabaseMigrator = require('./src/database/migrator');

async function main() {
  const migrator = new DatabaseMigrator();
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'run':
        await migrator.runMigrations();
        break;
        
      case 'status':
        await migrator.getMigrationStatus();
        break;
        
      case 'rollback':
        const filename = process.argv[3];
        if (!filename) {
          console.error('❌ Please specify migration filename to rollback');
          process.exit(1);
        }
        await migrator.rollbackMigration(filename);
        break;
        
      default:
        console.log('Database Migration Tool');
        console.log('Usage: node migrate.js <command>');
        console.log('');
        console.log('Commands:');
        console.log('  run     - Execute all pending migrations');
        console.log('  status  - Show migration status');
        console.log('  rollback <filename> - Rollback specific migration');
        break;
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

main();