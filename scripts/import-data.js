#!/usr/bin/env node

/**
 * Data Import Script for AnyNote Migration
 * Imports SQL data into MySQL/MariaDB database
 */

const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

class DataImporter {
  constructor() {
    this.connection = null;
    this.stats = {
      executed: 0,
      errors: 0,
      skipped: 0
    };
  }

  // Get database configuration from environment or defaults
  getDbConfig() {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'anynote_db',
      multipleStatements: true,
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000
    };
  }

  // Connect to database
  async connect() {
    try {
      console.log('Connecting to database...');
      this.connection = await mysql.createConnection(this.getDbConfig());
      console.log('Database connection established');
    } catch (error) {
      console.error('Failed to connect to database:', error.message);
      throw error;
    }
  }

  // Disconnect from database
  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('Database connection closed');
    }
  }

  // Execute SQL statement with error handling
  async executeStatement(sql) {
    try {
      // Skip empty statements and comments
      if (!sql.trim() || sql.trim().startsWith('--')) {
        this.stats.skipped++;
        return;
      }

      await this.connection.execute(sql);
      this.stats.executed++;
    } catch (error) {
      console.error('SQL Error:', error.message);
      console.error('Statement:', sql.substring(0, 200) + '...');
      this.stats.errors++;
    }
  }

  // Parse SQL file and execute statements
  async importFromFile(filePath) {
    console.log(`Reading SQL file: ${filePath}`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const statements = content.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);

      console.log(`Found ${statements.length} SQL statements to execute`);

      // Execute statements in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < statements.length; i += batchSize) {
        const batch = statements.slice(i, i + batchSize);
        console.log(`Executing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(statements.length / batchSize)}`);

        await Promise.all(batch.map(stmt => this.executeStatement(stmt + ';')));
      }

    } catch (error) {
      console.error('Failed to read or execute SQL file:', error.message);
      throw error;
    }
  }

  // Validate database connection and schema
  async validateDatabase() {
    try {
      console.log('Validating database setup...');

      // Check if database exists
      const [databases] = await this.connection.execute('SHOW DATABASES');
      const dbExists = databases.some(db => db.Database === this.getDbConfig().database);

      if (!dbExists) {
        throw new Error(`Database '${this.getDbConfig().database}' does not exist. Please run the schema first.`);
      }

      // Check if tables exist
      const [tables] = await this.connection.execute('SHOW TABLES');
      const requiredTables = ['users', 'notes', 'comments', 'notifications'];
      const existingTables = tables.map(row => Object.values(row)[0]);

      const missingTables = requiredTables.filter(table => !existingTables.includes(table));

      if (missingTables.length > 0) {
        throw new Error(`Missing tables: ${missingTables.join(', ')}. Please run the schema SQL first.`);
      }

      console.log('Database validation passed');

    } catch (error) {
      console.error('Database validation failed:', error.message);
      throw error;
    }
  }

  // Main import function
  async import(sqlFilePath = null) {
    const filePath = sqlFilePath || path.join(process.cwd(), 'migration-data.sql');

    try {
      await this.connect();
      await this.validateDatabase();
      await this.importFromFile(filePath);

      console.log('Import completed!');
      console.log('Statistics:', this.stats);

    } catch (error) {
      console.error('Import failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
function printUsage() {
  console.log(`
AnyNote Data Import Tool

Usage: node scripts/import-data.js [options] [sql-file]

Options:
  --help          Show this help message
  --host HOST     Database host (default: localhost)
  --port PORT     Database port (default: 3306)
  --user USER     Database user (default: root)
  --password PWD  Database password
  --database DB   Database name (default: anynote_db)

Environment Variables:
  DB_HOST         Database host
  DB_PORT         Database port
  DB_USER         Database user
  DB_PASSWORD     Database password
  DB_NAME         Database name

Examples:
  node scripts/import-data.js
  node scripts/import-data.js --host mysql.example.com --user myuser --password mypass migration-data.sql
`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help') {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        config[key] = value;
        i++; // Skip next arg
      } else {
        config[key] = true;
      }
    } else {
      config.sqlFile = arg;
    }
  }

  return config;
}

// Run the import if this script is executed directly
if (require.main === module) {
  const config = parseArgs();

  // Set environment variables from CLI args
  if (config.host) process.env.DB_HOST = config.host;
  if (config.port) process.env.DB_PORT = config.port;
  if (config.user) process.env.DB_USER = config.user;
  if (config.password) process.env.DB_PASSWORD = config.password;
  if (config.database) process.env.DB_NAME = config.database;

  const importer = new DataImporter();
  importer.import(config.sqlFile).catch(console.error);
}

module.exports = DataImporter;