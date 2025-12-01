-- Database Migration Schema for MySQL/MariaDB
-- AnyNote App Migration from File-based JSON to MySQL

CREATE DATABASE IF NOT EXISTS anynote_db;
USE anynote_db;

-- Users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(60) UNIQUE,
    display_username BOOLEAN DEFAULT FALSE,
    theme_preference ENUM('system', 'light', 'dark') DEFAULT 'system',
    role ENUM('anonymous', 'user', 'moderator', 'admin') DEFAULT 'anonymous',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- User followers/following relationships
CREATE TABLE user_follows (
    follower_id VARCHAR(255) NOT NULL,
    following_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_follower (follower_id),
    INDEX idx_following (following_id)
);

-- Notes table
CREATE TABLE notes (
    id VARCHAR(255) PRIMARY KEY,
    author_id VARCHAR(255) NOT NULL,
    title TEXT,
    content LONGTEXT,
    visibility ENUM('public', 'anonymous') DEFAULT 'anonymous',
    comments_locked BOOLEAN DEFAULT FALSE,
    customization JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_author (author_id),
    INDEX idx_visibility (visibility),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at),
    FULLTEXT idx_content (title, content)
);

-- Note media attachments
CREATE TABLE note_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note_id VARCHAR(255) NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    media_type ENUM('image', 'audio') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    INDEX idx_note (note_id)
);

-- Note reactions
CREATE TABLE note_reactions (
    note_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    reaction ENUM('love', 'dislike') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, user_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_note (note_id),
    INDEX idx_user (user_id)
);

-- Comments table
CREATE TABLE comments (
    id VARCHAR(255) PRIMARY KEY,
    note_id VARCHAR(255) NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    author_name VARCHAR(255),
    content LONGTEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    reply_to_comment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_comment_id) REFERENCES comments(id) ON DELETE SET NULL,
    INDEX idx_note (note_id),
    INDEX idx_author (author_id),
    INDEX idx_reply_to (reply_to_comment_id),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_content (content)
);

-- Comment participants (for private comments)
CREATE TABLE comment_participants (
    comment_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (comment_id, user_id),
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comment (comment_id),
    INDEX idx_user (user_id)
);

-- Notifications table
CREATE TABLE notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type ENUM('reaction', 'comment') NOT NULL,
    note_id VARCHAR(255) NOT NULL,
    note_title VARCHAR(500),
    actor_id VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255),
    reaction ENUM('love', 'dislike'),
    comment_id VARCHAR(255),
    is_private BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- Push subscriptions table
CREATE TABLE push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    endpoint VARCHAR(500) NOT NULL UNIQUE,
    expiration_time BIGINT,
    p256dh_key VARCHAR(100) NOT NULL,
    auth_key VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_endpoint (endpoint)
);

-- Indexes for performance
CREATE INDEX idx_notes_activity ON notes (updated_at, created_at);
CREATE INDEX idx_comments_thread ON comments (note_id, created_at);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read, created_at);