-- Migration: Remove repeat_interval CHECK constraint to allow custom intervals
-- This allows intervals like 'every_10_minutes', 'after_1_hour', etc.

-- SQLite doesn't support ALTER TABLE to drop constraints directly
-- We need to recreate the table

BEGIN TRANSACTION;

-- Step 1: Rename old table
ALTER TABLE reminders RENAME TO reminders_old;

-- Step 2: Create new table without the constraint
CREATE TABLE reminders (
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

-- Step 3: Copy data from old table
INSERT INTO reminders (id, task_id, title, description, remind_at, repeat_interval, is_active, last_triggered_at, created_at, updated_at)
SELECT id, task_id, title, description, remind_at, repeat_interval, is_active, last_triggered_at, created_at, updated_at
FROM reminders_old;

-- Step 4: Drop old table
DROP TABLE reminders_old;

COMMIT;
