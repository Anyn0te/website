
import fs from 'fs/promises';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env if .env.local doesn't exist/doesn't have everything

import pool from '../lib/db';
import { UserRecord } from '../src/modules/users/types';
import { StoredNote } from '../src/modules/notes/types';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'users');

async function migrate() {
    console.log("Starting migration from FS to DB...");

    try {
        await fs.access(STORAGE_DIR);
    } catch {
        console.log("No storage/users directory found. Nothing to migrate.");
        process.exit(0);
    }

    const files = await fs.readdir(STORAGE_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log(`Found ${jsonFiles.length} user files.`);

    for (const file of jsonFiles) {
        const filePath = path.join(STORAGE_DIR, file);
        console.log(`Processing ${file}...`);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const user = JSON.parse(content) as UserRecord;
            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                // 1. Upsert User
                // We use ON DUPLICATE KEY UPDATE to ensure we don't fail if the user already visited the new site (creating a blank record).
                await connection.query(
                    `INSERT INTO users (id, username, display_username, theme_preference, role, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             username = VALUES(username),
             display_username = VALUES(display_username),
             theme_preference = VALUES(theme_preference),
             role = VALUES(role),
             updated_at = VALUES(updated_at)
          `,
                    [
                        user.userId,
                        user.username,
                        user.displayUsername,
                        user.themePreference,
                        user.role,
                        new Date(user.createdAt),
                        new Date(user.updatedAt)
                    ]
                );

                // 2. Push Subscriptions
                if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
                    for (const sub of user.pushSubscriptions) {
                        await connection.query(
                            `INSERT INTO push_subscriptions (user_id, endpoint, expiration_time, p256dh_key, auth_key)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE expiration_time = VALUES(expiration_time)
              `,
                            [
                                user.userId,
                                sub.endpoint,
                                sub.expirationTime,
                                sub.keys.p256dh,
                                sub.keys.auth
                            ]
                        );
                    }
                }

                // 3. Notes
                if (user.notes && user.notes.length > 0) {
                    for (const note of user.notes) {
                        // Upsert Note
                        await connection.query(
                            `INSERT INTO notes (id, author_id, title, content, visibility, comments_locked, customization, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 title = VALUES(title),
                 content = VALUES(content),
                 visibility = VALUES(visibility),
                 comments_locked = VALUES(comments_locked),
                 customization = VALUES(customization),
                 updated_at = VALUES(updated_at)
              `,
                            [
                                note.id,
                                user.userId,
                                note.title,
                                note.content,
                                note.visibility,
                                note.commentsLocked,
                                JSON.stringify(note.customization),
                                new Date(note.createdAt),
                                new Date(note.updatedAt)
                            ]
                        );

                        // Note Media
                        if (note.media) {
                            // Clear existing media to avoid duplicates on re-run
                            await connection.query("DELETE FROM note_media WHERE note_id = ?", [note.id]);
                            for (const item of note.media) {
                                if (item.url) {
                                    await connection.query(
                                        "INSERT INTO note_media (note_id, media_url, media_type) VALUES (?, ?, ?)",
                                        [note.id, item.url, item.type]
                                    );
                                }
                            }
                        }

                        // Note Reactions (Stored in reactionMap)
                        if (note.reactionMap) {
                            // Clear existing reactions for this note to ensure sync
                            // Actually this might clear other people's reactions if we aren't careful?
                            // Wait, `reactionMap` contains ALL reactions for the note.
                            // So yes, we should sync this map to the table.
                            // BUT, if another user file is processed later, it might also have this note's reaction map?
                            // No, `user.notes` contains notes AUTHORED by the user?
                            // Let's check `userRepository`. `appendNoteToUser` stores `StoredNote`.
                            // In the old system, `StoredNote` has `reactionMap`.
                            // Yes, duplicate data problem.
                            // Strategy: We can use `INSERT IGNORE` or `ON DUPLICATE KEY UPDATE` for reactions.
                            // Scan entries in reactionMap: { userId: reactionType }

                            for (const [reactorId, reaction] of Object.entries(note.reactionMap)) {
                                await connection.query(
                                    `INSERT INTO note_reactions (note_id, user_id, reaction)
                          VALUES (?, ?, ?)
                          ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)
                         `,
                                    [note.id, reactorId, reaction]
                                );
                            }
                        }

                        // Comments
                        if (note.comments) {
                            for (const comment of note.comments) {
                                await connection.query(
                                    `INSERT INTO comments (id, note_id, author_id, author_name, content, is_private, reply_to_comment_id, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE content = VALUES(content)
                        `,
                                    [
                                        comment.id,
                                        note.id,
                                        comment.authorId,
                                        comment.authorName,
                                        comment.content,
                                        comment.isPrivate,
                                        comment.replyToCommentId,
                                        new Date(comment.createdAt),
                                        new Date(comment.updatedAt)
                                    ]
                                );

                                if (comment.isPrivate && comment.participants) {
                                    for (const pid of comment.participants) {
                                        await connection.query(
                                            "INSERT IGNORE INTO comment_participants (comment_id, user_id) VALUES (?, ?)",
                                            [comment.id, pid]
                                        );
                                    }
                                }
                            }
                        }
                    }
                }

                // 4. Notifications
                if (user.notifications && user.notifications.length > 0) {
                    for (const notif of user.notifications) {
                        // Try to avoid duplicates? ID should be unique.
                        await connection.query(
                            `INSERT IGNORE INTO notifications (id, user_id, type, note_id, note_title, actor_id, actor_name, reaction, comment_id, is_private, is_read, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     `,
                            [
                                notif.id,
                                user.userId,
                                notif.type,
                                notif.noteId,
                                notif.noteTitle,
                                notif.actorId,
                                notif.actorName,
                                notif.reaction,
                                notif.commentId,
                                notif.isPrivate,
                                notif.read,
                                new Date(notif.createdAt)
                            ]
                        );
                    }
                }

                // 5. Following
                if (user.following && user.following.length > 0) {
                    for (const followingId of user.following) {
                        await connection.query(
                            "INSERT IGNORE INTO user_follows (follower_id, following_id) VALUES (?, ?)",
                            [user.userId, followingId]
                        );
                    }
                }

                await connection.commit();
                console.log(`Migrated user ${user.userId}`);

                // Delete file on success
                await fs.unlink(filePath);
                console.log(`Deleted ${file}`);

            } catch (err) {
                await connection.rollback();
                console.error(`Failed to migrate ${file}:`, err);
                // Do NOT delete file if failed
            } finally {
                connection.release();
            }

        } catch (err) {
            console.error(`Error processing file ${file}:`, err);
        }
    }

    console.log("Migration complete.");
    await pool.end();
}

migrate();
