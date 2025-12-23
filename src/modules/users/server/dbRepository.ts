import pool from "@/lib/db";
import { UserRecord, UserSettingsPayload, UserRole, ThemePreference } from "@/modules/users/types";
import { RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from 'uuid';
import {
    StoredNote,
    NoteReactionType,
    StoredNoteComment,
} from "@/modules/notes/types";
import { StoredNotification } from "@/modules/notifications/types";

// --- Helpers ---

const fetchNoteReactions = async (noteId: string) => {
    const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT reaction, COUNT(*) as count FROM note_reactions WHERE note_id = ? GROUP BY reaction",
        [noteId]
    );

    const reactions = { love: 0, dislike: 0 };
    rows.forEach(row => {
        if (row.reaction === 'love') reactions.love = row.count;
        if (row.reaction === 'dislike') reactions.dislike = row.count;
    });
    return reactions;
};

const fetchNoteReactionMap = async (noteId: string) => {
    const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT user_id, reaction FROM note_reactions WHERE note_id = ?",
        [noteId]
    );

    const map: Record<string, "love" | "dislike"> = {};
    rows.forEach(row => {
        map[row.user_id] = row.reaction as "love" | "dislike";
    });
    return map;
};

const getNoteById = async (noteId: string): Promise<StoredNote | null> => {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM notes WHERE id = ?", [noteId]);
    if (rows.length === 0) return null;
    const row = rows[0];

    const reactions = await fetchNoteReactions(noteId);
    const reactionMap = await fetchNoteReactionMap(noteId);

    const [mediaRows] = await pool.query<RowDataPacket[]>("SELECT media_url, media_type FROM note_media WHERE note_id = ? ORDER BY id ASC", [noteId]);

    const [commentRows] = await pool.query<RowDataPacket[]>("SELECT * FROM comments WHERE note_id = ?", [noteId]);

    const comments: StoredNoteComment[] = await Promise.all(commentRows.map(async c => {
        let participants: string[] = [];
        if (c.is_private) {
            const [pRows] = await pool.query<RowDataPacket[]>("SELECT user_id FROM comment_participants WHERE comment_id = ?", [c.id]);
            participants = pRows.map(p => p.user_id);
        }

        return {
            id: c.id,
            authorId: c.author_id,
            authorName: c.author_name,
            content: c.content,
            createdAt: c.created_at.toISOString(),
            updatedAt: c.updated_at.toISOString(),
            isPrivate: Boolean(c.is_private),
            participants,
            replyToCommentId: c.reply_to_comment_id
        };
    }));

    return {
        id: row.id,
        title: row.title || "",
        content: row.content || "",
        media: mediaRows.map(m => ({ url: m.media_url, type: m.media_type as "image" | "audio" })),
        visibility: row.visibility,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        reactions,
        reactionMap,
        comments,
        commentsLocked: Boolean(row.comments_locked),
        customization: row.customization ? (typeof row.customization === 'string' ? JSON.parse(row.customization) : row.customization) : null,
    };
};

const getUserDetails = async (userId: string): Promise<UserRecord | null> => {
    const [userRows] = await pool.query<RowDataPacket[]>("SELECT * FROM users WHERE id = ?", [userId]);
    if (userRows.length === 0) return null;
    const user = userRows[0];

    const [followRows] = await pool.query<RowDataPacket[]>(
        "SELECT follower_id, following_id FROM user_follows WHERE follower_id = ? OR following_id = ?",
        [userId, userId]
    );

    const followers = followRows.filter(r => r.following_id === userId).map(r => r.follower_id as string);
    const following = followRows.filter(r => r.follower_id === userId).map(r => r.following_id as string);

    const [noteIds] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM notes WHERE author_id = ? ORDER BY created_at DESC LIMIT 50`,
        [userId]
    );

    const notes = await Promise.all(noteIds.map(row => getNoteById(row.id)));

    const [notifRows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
        [userId]
    );

    const notifications = notifRows.map(row => ({
        id: row.id,
        type: row.type,
        noteId: row.note_id,
        noteTitle: row.note_title,
        actorId: row.actor_id,
        actorName: row.actor_name,
        reaction: row.reaction,
        commentId: row.comment_id,
        isPrivate: Boolean(row.is_private),
        read: Boolean(row.is_read),
        createdAt: row.created_at.toISOString(),
    }));

    const [subRows] = await pool.query<RowDataPacket[]>("SELECT * FROM push_subscriptions WHERE user_id = ?", [userId]);
    const pushSubscriptions = subRows.map(row => ({
        endpoint: row.endpoint,
        expirationTime: row.expiration_time ? Number(row.expiration_time) : null,
        keys: { p256dh: row.p256dh_key, auth: row.auth_key }
    }));

    return {
        userId: user.id,
        username: user.username,
        displayUsername: Boolean(user.display_username),
        themePreference: user.theme_preference as ThemePreference,
        followers,
        following,
        notes: notes.filter(n => n !== null) as StoredNote[],
        notifications,
        pushSubscriptions,
        role: user.role as UserRole,
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString(),
    };
};

// --- User Functions ---

export const getOrCreateUser = async (userId: string): Promise<UserRecord> => {
    let user = await getUserDetails(userId);
    if (!user) {
        await pool.query("INSERT IGNORE INTO users (id, role, theme_preference) VALUES (?, 'anonymous', 'system')", [userId]);
        user = await getUserDetails(userId);
    }
    if (!user) throw new Error("Failed to create user");
    return user;
};

export const isUsernameTaken = async (username: string, excludeUserId?: string): Promise<boolean> => {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE username = ? AND id != ?", [username, excludeUserId || '']);
    return rows.length > 0;
};

export const updateUserSettings = async (
    userId: string,
    { username, displayUsername, themePreference }: UserSettingsPayload
): Promise<UserRecord> => {
    const trimmed = username?.trim() || null;
    if (trimmed) {
        const taken = await isUsernameTaken(trimmed, userId);
        if (taken) throw new Error("This username is already taken.");
    }

    await pool.query("UPDATE users SET username = ?, display_username = ?, theme_preference = ? WHERE id = ?", [trimmed, displayUsername, themePreference, userId]);
    return getOrCreateUser(userId);
};

export const setFollowingStatus = async (userId: string, targetUserId: string, shouldFollow: boolean) => {
    if (userId === targetUserId) throw new Error("You cannot follow yourself.");

    if (shouldFollow) {
        await pool.query("INSERT IGNORE INTO user_follows (follower_id, following_id) VALUES (?, ?)", [userId, targetUserId]);
    } else {
        await pool.query("DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?", [userId, targetUserId]);
    }

    const [follower, target] = await Promise.all([getOrCreateUser(userId), getOrCreateUser(targetUserId)]);
    return { follower, target };
};

// --- Note Functions ---

export const appendNoteToUser = async (userId: string, note: StoredNote) => {
    await pool.query(
        `INSERT INTO notes (id, author_id, title, content, visibility, comments_locked, customization, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [note.id, userId, note.title, note.content, note.visibility, note.commentsLocked, JSON.stringify(note.customization), new Date(note.createdAt), new Date(note.updatedAt)]
    );

    if (note.media && note.media.length > 0) {
        for (const item of note.media) {
            if (item.url) {
                await pool.query("INSERT INTO note_media (note_id, media_url, media_type) VALUES (?, ?, ?)", [note.id, item.url, item.type]);
            }
        }
    }
};

export const updateNoteForUser = async ({
    authorId, noteId, editorId: _editorId, title, content
}: {
    authorId: string; noteId: string; editorId: string; title?: string | null; content?: string | null;
}): Promise<StoredNote> => {
    const updates: string[] = [];
    const values: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (title !== undefined) { updates.push("title = ?"); values.push(title); }
    if (content !== undefined) { updates.push("content = ?"); values.push(content); }
    updates.push("updated_at = NOW()");

    if (updates.length > 0) {
        await pool.query(`UPDATE notes SET ${updates.join(", ")} WHERE id = ? AND author_id = ?`, [...values, noteId, authorId]);
    }

    return (await getNoteById(noteId))!;
};

export const deleteNoteForUser = async ({ authorId: _authorId, noteId, actorId: _actorId }: { authorId: string; noteId: string; actorId: string; }) => {
    // Use _ prefix for unused vars
    await pool.query("DELETE FROM notes WHERE id = ?", [noteId]);
};

export const applyReactionToNote = async ({
    authorId, noteId, reactorId, reaction
}: {
    authorId: string; noteId: string; reactorId: string; reaction: NoteReactionType | null;
}): Promise<StoredNote> => {
    if (reaction === null) {
        await pool.query("DELETE FROM note_reactions WHERE note_id = ? AND user_id = ?", [noteId, reactorId]);
    } else {
        await pool.query("INSERT INTO note_reactions (note_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)", [noteId, reactorId, reaction]);
    }

    if (reaction && reactorId !== authorId) {
        const reactor = await getOrCreateUser(reactorId);
        const note = await getNoteById(noteId);
        if (note) {
            const actorName = reactor.displayUsername && reactor.username ? `@${reactor.username}` : "Someone";
            await addNotificationToUser(authorId, {
                type: "reaction",
                noteId: noteId,
                noteTitle: note.title || "Untitled Note",
                actorId: reactorId,
                actorName: actorName,
                reaction: reaction
            });
        }
    }

    return (await getNoteById(noteId))!;
};

export const setNoteCommentsLocked = async ({ authorId: _authorId, noteId, locked }: { authorId: string; noteId: string; locked: boolean; }): Promise<StoredNote> => {
    await pool.query("UPDATE notes SET comments_locked = ? WHERE id = ?", [locked, noteId]);
    return (await getNoteById(noteId))!;
};

export const getAggregatedNotesForUser = async (userId?: string | null, sortBy: 'date' | 'activity' = 'date'): Promise<any[]> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let query = `SELECT * FROM notes WHERE visibility = 'public'`;
    let params: (string | number)[] = [];

    if (userId) {
        query = `
            SELECT distinct n.* 
            FROM notes n 
            LEFT JOIN user_follows uf ON n.author_id = uf.following_id AND uf.follower_id = ?
            WHERE n.visibility = 'public' 
               OR n.author_id = ? 
               OR (uf.follower_id IS NOT NULL)
        `;
        params = [userId, userId];
    }

    query += ` ORDER BY ${sortBy === 'activity' ? 'updated_at' : 'created_at'} DESC LIMIT 100`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    const viewer = userId ? await getOrCreateUser(userId) : null;
    const canModerate = viewer?.role === 'admin' || viewer?.role === 'moderator';

    const fullNotes = await Promise.all(rows.map(async row => {
        const stored = await getNoteById(row.id);
        if (!stored) return null;

        const author = await getOrCreateUser(row.author_id);

        const viewerReaction = userId ? stored.reactionMap[userId] || null : null;
        const isOwn = userId === row.author_id;

        return {
            ...stored,
            authorId: row.author_id,
            authorName: author.username ? (author.displayUsername ? `@${author.username}` : null) : null,
            isFollowedAuthor: viewer ? viewer.following.includes(row.author_id) : false,
            isOwnNote: isOwn,
            viewerReaction,
            publicCommentCount: stored.comments.filter(c => !c.isPrivate).length,
            viewerCanModerate: canModerate,
            viewerRole: viewer?.role || 'anonymous',
            comments: stored.comments.map(c => ({
                ...c,
                content: c.content,
                isVisibleToViewer: !c.isPrivate || (userId && c.participants.includes(userId)) || canModerate || isOwn,
                isEditableByViewer: userId === c.authorId || canModerate,
                isVisible: !c.isPrivate || (userId && c.participants.includes(userId)) || canModerate || isOwn
            })).filter(c => c.isVisibleToViewer)
        };
    }));

    return fullNotes.filter(n => n !== null);
};

// --- Comment Functions ---

export const addCommentToNote = async ({
    authorId, noteId, commenterId, commenterName, content, isPrivate, participantUserId, replyToCommentId
}: {
    authorId: string; noteId: string; commenterId: string; commenterName: string | null; content: string; isPrivate: boolean; participantUserId?: string | null; replyToCommentId?: string | null;
}): Promise<StoredNoteComment> => {
    const id = uuidv4();
    const createdAt = new Date();

    await pool.query(
        "INSERT INTO comments (id, note_id, author_id, author_name, content, is_private, reply_to_comment_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, noteId, commenterId, commenterName, content, isPrivate, replyToCommentId, createdAt, createdAt]
    );

    const participants = [];
    if (isPrivate && participantUserId) {
        await pool.query("INSERT INTO comment_participants (comment_id, user_id) VALUES (?, ?)", [id, participantUserId]);
        await pool.query("INSERT IGNORE INTO comment_participants (comment_id, user_id) VALUES (?, ?)", [id, commenterId]);
        participants.push(participantUserId, commenterId);
    }

    if (authorId !== commenterId) {
        const note = await getNoteById(noteId);
        await addNotificationToUser(authorId, {
            type: "comment",
            noteId,
            noteTitle: note?.title,
            actorId: commenterId,
            actorName: commenterName,
            commentId: id,
            isPrivate
        });
    }

    return {
        id, authorId: commenterId, authorName: commenterName, content, createdAt: createdAt.toISOString(), updatedAt: createdAt.toISOString(), isPrivate, participants, replyToCommentId: replyToCommentId || null
    };
};

export const updateCommentOnNote = async ({
    authorId: _authorId, noteId: _noteId, commentId, editorId: _editorId, content
}: {
    authorId: string; noteId: string; commentId: string; editorId: string; content: string;
}): Promise<StoredNoteComment> => {
    await pool.query("UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?", [content, commentId]);
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM comments WHERE id = ?", [commentId]);
    const row = rows[0];
    return {
        id: row.id, authorId: row.author_id, authorName: row.author_name, content: row.content, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(), isPrivate: Boolean(row.is_private), participants: [], replyToCommentId: row.reply_to_comment_id
    };
};


export const deleteCommentFromNote = async ({
    commentId
}: {
    authorId: string; noteId: string; commentId: string; actorId?: string;
}) => {
    await pool.query("DELETE FROM comments WHERE id = ?", [commentId]);
};

// --- Notification Functions ---

export const addNotificationToUser = async (
    userId: string,
    notification: Partial<StoredNotification>
) => {
    const id = uuidv4();
    await pool.query(
        `INSERT INTO notifications (id, user_id, type, note_id, note_title, actor_id, actor_name, reaction, comment_id, is_private, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, userId, notification.type, notification.noteId, notification.noteTitle, notification.actorId, notification.actorName, notification.reaction, notification.commentId, notification.isPrivate, false]
    );
};

export const getNotificationsForUser = async (userId: string): Promise<StoredNotification[]> => {
    return (await getUserDetails(userId))?.notifications || [];
};

export const markNotificationsAsRead = async (userId: string, notificationIds?: string[]): Promise<StoredNotification[]> => {
    if (notificationIds && notificationIds.length > 0) {
        await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND id IN (?)", [userId, notificationIds]);
    } else {
        await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", [userId]);
    }
    return getNotificationsForUser(userId);
};
