-- Task Reminder Database Schema
-- SQLite database for local task and reminder management

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TEXT,
    completed_at TEXT,
    image_path TEXT,
    notes TEXT,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- REMINDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    remind_at TEXT NOT NULL,
    repeat_interval TEXT NOT NULL DEFAULT 'none',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_triggered_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================================
-- TAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- TASK_TAGS JUNCTION TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ============================================================================
-- SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date ON tasks(status, due_date);

-- Reminder indexes
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_reminders_active_remind_at ON reminders(is_active, remind_at);

-- Tag indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Task tags indexes
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Update tasks.updated_at on any update
CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp 
AFTER UPDATE ON tasks
BEGIN
    UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Update reminders.updated_at on any update
CREATE TRIGGER IF NOT EXISTS update_reminders_timestamp 
AFTER UPDATE ON reminders
BEGIN
    UPDATE reminders SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Update settings.updated_at on any update
CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
AFTER UPDATE ON settings
BEGIN
    UPDATE settings SET updated_at = datetime('now') WHERE key = NEW.key;
END;

-- Auto-set completed_at when task status changes to completed
CREATE TRIGGER IF NOT EXISTS set_completed_at 
AFTER UPDATE OF status ON tasks
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    UPDATE tasks SET completed_at = datetime('now') WHERE id = NEW.id;
END;

-- Clear completed_at when task status changes from completed
CREATE TRIGGER IF NOT EXISTS clear_completed_at 
AFTER UPDATE OF status ON tasks
WHEN NEW.status != 'completed' AND OLD.status = 'completed'
BEGIN
    UPDATE tasks SET completed_at = NULL WHERE id = NEW.id;
END;

-- ============================================================================
-- INITIAL DATA (Default settings)
-- ============================================================================

INSERT OR IGNORE INTO settings (key, value) VALUES
    ('theme', 'light'),
    ('notifications_enabled', 'true'),
    ('notification_sound', 'true'),
    ('default_reminder_minutes', '15'),
    ('start_minimized', 'false'),
    ('auto_start', 'false');

-- Default tags
INSERT OR IGNORE INTO tags (id, name, color) VALUES
    ('tag-work', 'Work', '#3b82f6'),
    ('tag-personal', 'Personal', '#10b981'),
    ('tag-urgent', 'Urgent', '#ef4444'),
    ('tag-important', 'Important', '#f59e0b');
