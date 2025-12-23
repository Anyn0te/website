# AnyNote Database Migration Guide

This guide covers migrating AnyNote from file-based JSON storage to MySQL/MariaDB database.

## Overview

**Current Storage**: File-based JSON files in `storage/users/` directory
**Target Storage**: MySQL/MariaDB relational database
**Migration Type**: One-way migration (no automatic rollback to files)

## Prerequisites

- MySQL 8.0+ or MariaDB 10.5+
- Node.js 18+
- Access to production server
- Database backup capabilities

## Database Setup

### 1. Install MySQL/MariaDB

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**CentOS/RHEL:**
```bash
sudo yum install mysql-server
sudo systemctl start mysqld
sudo mysql_secure_installation
```

### 2. Create Database and User

```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database and user
CREATE DATABASE anynote_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'anynote'@'localhost' IDENTIFIED BY 'anyn0te_passwd';
GRANT ALL PRIVILEGES ON anynote_db.* TO 'anynote'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Run Schema

```bash
mysql -u anynote -p anynote_db < database-schema.sql
```

## Migration Process

### Phase 1: Development Testing

1. **Backup current data** (always!)
   ```bash
   cp -r storage storage.backup.$(date +%Y%m%d_%H%M%S)
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Export data from JSON files**
   ```bash
   npm run migrate:export
   ```
   This creates `migration-data.sql`

4. **Import data to database**
   ```bash
   # Set environment variables or use CLI args
   export DB_HOST=localhost
   export DB_USER=anynote_user
   export DB_PASSWORD=your_password
   export DB_NAME=anynote_db

   npm run migrate:import
   ```

5. **Verify import**
   ```sql
   mysql -u anynote_user -p anynote_db -e "SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as notes FROM notes;"
   ```

### Phase 2: Production Migration

**⚠️ CRITICAL: Plan for downtime and have rollback plan**

#### Pre-Migration Steps

1. **Announce maintenance window** to users
2. **Create full backup** of current system
3. **Test migration on staging environment**
4. **Prepare rollback procedures** (see below)

#### Migration Steps

1. **Stop the application**
   ```bash
   npm run pm2:stop
   ```

2. **Create final backup**
   ```bash
   # On production server
   cp -r storage storage.pre_migration.$(date +%Y%m%d_%H%M%S)
   ```

3. **Export production data**
   ```bash
   npm run migrate:export
   ```

4. **Setup production database**
   - Create database on production DB server
   - Run schema SQL
   - Configure environment variables

5. **Import data to production**
   ```bash
   # Configure production DB connection
   export DB_HOST=your_db_host
   export DB_USER=anynote_user
   export DB_PASSWORD=production_password

   npm run migrate:import
   ```

6. **Update application code** (see next section)
7. **Deploy updated application**
   ```bash
   npm run build
   npm run start
   ```

8. **Verify functionality**
   - Test user login
   - Test note creation/editing
   - Test comments and reactions
   - Monitor error logs

9. **Monitor for 24-48 hours**
   - Check application logs
   - Monitor database performance
   - Verify user-reported issues

#### Post-Migration Steps

1. **Keep old storage as backup** for 30 days
2. **Update documentation**
3. **Monitor database usage and optimize if needed**

## Rollback Procedures

### Emergency Rollback (within 1 hour)

If critical issues arise immediately after migration:

1. **Stop new application**
   ```bash
   npm run pm2:stop
   ```

2. **Restore file storage**
   ```bash
   cp -r storage.pre_migration.* storage
   ```

3. **Deploy previous version**
   ```bash
   git checkout previous_commit_hash
   npm run build
   npm run start
   ```

### Data Recovery Rollback (if needed)

If you need to recover specific data from database back to files:

1. **Export data from database to JSON**
   ```javascript
   // Create a recovery script if needed
   const mysql = require('mysql2/promise');
   // ... implement export from DB to JSON format
   ```

2. **Restore specific user files**
3. **Verify data integrity**

## Environment Variables

Add these to your production environment:

```bash
# Database Configuration
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=anynote_user
DB_PASSWORD=your_secure_password
DB_NAME=anynote_db

# Keep existing Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=...
# ... other Firebase vars
```

## Performance Considerations

### Database Optimization

1. **Indexes**: Already included in schema
2. **Connection pooling**: Consider using connection pool in production
3. **Query optimization**: Monitor slow queries

### Monitoring

```sql
-- Useful monitoring queries
SHOW PROCESSLIST;
SHOW ENGINE INNODB STATUS;
SELECT * FROM information_schema.innodb_trx WHERE trx_started < DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

## Troubleshooting

### Common Issues

1. **Connection timeouts during import**
   - Increase MySQL timeouts
   - Import in smaller batches
   - Check network connectivity

2. **Memory issues during export**
   - Process users in chunks
   - Increase Node.js memory limit: `node --max-old-space-size=4096`

3. **Data inconsistencies**
   - Verify export/import logs
   - Check for special characters in content
   - Validate foreign key relationships

### Logs to Check

- Application logs: `~/.pm2/logs/`
- MySQL error log: `/var/log/mysql/error.log`
- Migration script console output

## Data Validation

After migration, run these checks:

```sql
-- Count verification
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Notes', COUNT(*) FROM notes
UNION ALL
SELECT 'Comments', COUNT(*) FROM comments
UNION ALL
SELECT 'Reactions', COUNT(*) FROM note_reactions;

-- Data integrity checks
SELECT 'Orphaned notes' as issue, COUNT(*) as count
FROM notes LEFT JOIN users ON notes.author_id = users.id
WHERE users.id IS NULL

UNION ALL

SELECT 'Orphaned comments', COUNT(*)
FROM comments LEFT JOIN notes ON comments.note_id = notes.id
WHERE notes.id IS NULL;
```

## Security Considerations

1. **Database credentials**: Use strong passwords, restrict user privileges
2. **Network security**: Configure firewall rules for DB access
3. **SSL connections**: Enable SSL for production database connections
4. **Backup encryption**: Encrypt database backups

## Support

If you encounter issues:
1. Check this guide first
2. Review migration script logs
3. Test on staging environment
4. Have database administrator available during production migration

---

**Migration completed by**: _______________
**Date**: _______________
**Production server**: _______________
**Database server**: _______________
**Backup location**: _______________