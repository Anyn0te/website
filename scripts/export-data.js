#!/usr/bin/env node

/**
 * Data Export Script for AnyNote Migration
 * Exports data from JSON files to SQL INSERT statements for MySQL import
 */

const fs = require('fs').promises;
const path = require('path');

const STORAGE_ROOT = path.join(process.cwd(), 'storage');
const USERS_DIRECTORY = path.join(STORAGE_ROOT, 'users');

class DataExporter {
  constructor() {
    this.sqlStatements = [];
    this.stats = {
      users: 0,
      notes: 0,
      comments: 0,
      reactions: 0,
      notifications: 0,
      follows: 0,
      media: 0,
      pushSubscriptions: 0
    };
  }

  // Escape strings for SQL
  escapeString(str) {
    if (str === null || str === undefined) return 'NULL';
    return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  }

  // Format timestamp for MySQL
  formatTimestamp(dateStr) {
    if (!dateStr) return 'CURRENT_TIMESTAMP';
    const date = new Date(dateStr);
    return `'${date.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }

  // Generate SQL INSERT for users
  exportUser(user) {
    const sql = `INSERT INTO users (id, username, display_username, theme_preference, role, created_at, updated_at) VALUES (
      ${this.escapeString(user.userId)},
      ${this.escapeString(user.username)},
      ${user.displayUsername ? 1 : 0},
      ${this.escapeString(user.themePreference || 'system')},
      ${this.escapeString(user.role || 'anonymous')},
      ${this.formatTimestamp(user.createdAt)},
      ${this.formatTimestamp(user.updatedAt)}
    ) ON DUPLICATE KEY UPDATE
      username = VALUES(username),
      display_username = VALUES(display_username),
      theme_preference = VALUES(theme_preference),
      role = VALUES(role),
      updated_at = VALUES(updated_at);`;

    this.sqlStatements.push(sql);
    this.stats.users++;
  }

  // Generate SQL INSERT for follows
  exportFollows(user) {
    if (!user.following || !Array.isArray(user.following)) return;

    for (const followingId of user.following) {
      const sql = `INSERT IGNORE INTO user_follows (follower_id, following_id) VALUES (
        ${this.escapeString(user.userId)},
        ${this.escapeString(followingId)}
      );`;

      this.sqlStatements.push(sql);
      this.stats.follows++;
    }
  }

  // Generate SQL INSERT for notes
  exportNote(note, authorId) {
    const sql = `INSERT INTO notes (id, author_id, title, content, visibility, comments_locked, customization, created_at, updated_at) VALUES (
      ${this.escapeString(note.id)},
      ${this.escapeString(authorId)},
      ${this.escapeString(note.title)},
      ${this.escapeString(note.content)},
      ${this.escapeString(note.visibility || 'anonymous')},
      ${note.commentsLocked ? 1 : 0},
      ${note.customization ? this.escapeString(JSON.stringify(note.customization)) : 'NULL'},
      ${this.formatTimestamp(note.createdAt)},
      ${this.formatTimestamp(note.updatedAt)}
    ) ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      content = VALUES(content),
      visibility = VALUES(visibility),
      comments_locked = VALUES(comments_locked),
      customization = VALUES(customization),
      updated_at = VALUES(updated_at);`;

    this.sqlStatements.push(sql);
    this.stats.notes++;

    // Export media for this note
    if (note.media && Array.isArray(note.media)) {
      this.exportNoteMedia(note.id, note.media);
    }

    // Export reactions for this note
    if (note.reactionMap) {
      this.exportNoteReactions(note.id, note.reactionMap);
    }

    // Export comments for this note
    if (note.comments && Array.isArray(note.comments)) {
      this.exportComments(note.id, note.comments);
    }
  }

  // Generate SQL INSERT for note media
  exportNoteMedia(noteId, media) {
    for (const mediaItem of media) {
      const sql = `INSERT INTO note_media (note_id, media_url, media_type) VALUES (
        ${this.escapeString(noteId)},
        ${this.escapeString(mediaItem.url)},
        ${this.escapeString(mediaItem.type)}
      );`;

      this.sqlStatements.push(sql);
      this.stats.media++;
    }
  }

  // Generate SQL INSERT for note reactions
  exportNoteReactions(noteId, reactionMap) {
    for (const [userId, reaction] of Object.entries(reactionMap)) {
      if (reaction === 'love' || reaction === 'dislike') {
        const sql = `INSERT INTO note_reactions (note_id, user_id, reaction) VALUES (
          ${this.escapeString(noteId)},
          ${this.escapeString(userId)},
          ${this.escapeString(reaction)}
        ) ON DUPLICATE KEY UPDATE reaction = VALUES(reaction);`;

        this.sqlStatements.push(sql);
        this.stats.reactions++;
      }
    }
  }

  // Generate SQL INSERT for comments
  exportComments(noteId, comments) {
    for (const comment of comments) {
      const sql = `INSERT INTO comments (id, note_id, author_id, author_name, content, is_private, reply_to_comment_id, created_at, updated_at) VALUES (
        ${this.escapeString(comment.id)},
        ${this.escapeString(noteId)},
        ${this.escapeString(comment.authorId)},
        ${this.escapeString(comment.authorName)},
        ${this.escapeString(comment.content)},
        ${comment.isPrivate ? 1 : 0},
        ${this.escapeString(comment.replyToCommentId)},
        ${this.formatTimestamp(comment.createdAt)},
        ${this.formatTimestamp(comment.updatedAt)}
      ) ON DUPLICATE KEY UPDATE
        content = VALUES(content),
        is_private = VALUES(is_private),
        updated_at = VALUES(updated_at);`;

      this.sqlStatements.push(sql);
      this.stats.comments++;

      // Export comment participants
      if (comment.participants && Array.isArray(comment.participants)) {
        this.exportCommentParticipants(comment.id, comment.participants);
      }
    }
  }

  // Generate SQL INSERT for comment participants
  exportCommentParticipants(commentId, participants) {
    for (const userId of participants) {
      const sql = `INSERT IGNORE INTO comment_participants (comment_id, user_id) VALUES (
        ${this.escapeString(commentId)},
        ${this.escapeString(userId)}
      );`;

      this.sqlStatements.push(sql);
    }
  }

  // Generate SQL INSERT for notifications
  exportNotifications(userId, notifications) {
    for (const notification of notifications) {
      const sql = `INSERT INTO notifications (id, user_id, type, note_id, note_title, actor_id, actor_name, reaction, comment_id, is_private, is_read, created_at) VALUES (
        ${this.escapeString(notification.id)},
        ${this.escapeString(userId)},
        ${this.escapeString(notification.type)},
        ${this.escapeString(notification.noteId)},
        ${this.escapeString(notification.noteTitle)},
        ${this.escapeString(notification.actorId)},
        ${this.escapeString(notification.actorName)},
        ${this.escapeString(notification.reaction)},
        ${this.escapeString(notification.commentId)},
        ${notification.isPrivate ? 1 : 0},
        ${notification.read ? 1 : 0},
        ${this.formatTimestamp(notification.createdAt)}
      ) ON DUPLICATE KEY UPDATE
        is_read = VALUES(is_read);`;

      this.sqlStatements.push(sql);
      this.stats.notifications++;
    }
  }

  // Generate SQL INSERT for push subscriptions
  exportPushSubscriptions(userId, pushSubscriptions) {
    if (!pushSubscriptions || !Array.isArray(pushSubscriptions)) return;

    for (const subscription of pushSubscriptions) {
      if (!subscription.endpoint || !subscription.keys) continue;

      const sql = `INSERT INTO push_subscriptions (user_id, endpoint, expiration_time, p256dh_key, auth_key) VALUES (
        ${this.escapeString(userId)},
        ${this.escapeString(subscription.endpoint)},
        ${subscription.expirationTime || 'NULL'},
        ${this.escapeString(subscription.keys.p256dh)},
        ${this.escapeString(subscription.keys.auth)}
      ) ON DUPLICATE KEY UPDATE
        expiration_time = VALUES(expiration_time);`;

      this.sqlStatements.push(sql);
      this.stats.pushSubscriptions++;
    }
  }

  // Process a single user file
  async processUserFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const user = JSON.parse(content);

      if (!user.userId) {
        console.warn(`Skipping file ${filePath}: missing userId`);
        return;
      }

      console.log(`Processing user: ${user.username || user.userId}`);

      // Export user
      this.exportUser(user);

      // Export follows
      this.exportFollows(user);

      // Export notifications
      if (user.notifications && Array.isArray(user.notifications)) {
        this.exportNotifications(user.userId, user.notifications);
      }

      // Export push subscriptions
      if (user.pushSubscriptions) {
        this.exportPushSubscriptions(user.userId, user.pushSubscriptions);
      }

      // Export notes
      if (user.notes && Array.isArray(user.notes)) {
        for (const note of user.notes) {
          this.exportNote(note, user.userId);
        }
      }

    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }

  // Main export function
  async export() {
    console.log('Starting data export...');

    try {
      // Ensure users directory exists
      await fs.access(USERS_DIRECTORY);
    } catch (error) {
      console.error('Users directory not found:', USERS_DIRECTORY);
      return;
    }

    // Read all user files
    const entries = await fs.readdir(USERS_DIRECTORY, { withFileTypes: true });
    const userFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.json'));

    console.log(`Found ${userFiles.length} user files to process`);

    // Process each user file
    for (const file of userFiles) {
      const filePath = path.join(USERS_DIRECTORY, file.name);
      await this.processUserFile(filePath);
    }

    // Write SQL file
    const sqlContent = [
      '-- AnyNote Data Migration SQL',
      '-- Generated on ' + new Date().toISOString(),
      '-- Stats: ' + JSON.stringify(this.stats, null, 2),
      '',
      'USE anynote_db;',
      '',
      ...this.sqlStatements
    ].join('\n');

    const outputPath = path.join(process.cwd(), 'migration-data.sql');
    await fs.writeFile(outputPath, sqlContent, 'utf-8');

    console.log('Export completed!');
    console.log('Statistics:', this.stats);
    console.log(`SQL file written to: ${outputPath}`);

  } catch (error) {
    console.error('Export failed:', error);
  }
}

// Run the export if this script is executed directly
if (require.main === module) {
  const exporter = new DataExporter();
  exporter.export().catch(console.error);
}

module.exports = DataExporter;