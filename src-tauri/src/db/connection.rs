use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Database connection manager
pub struct Database {
    conn: Connection,
}

impl Database {
    /// Initialize the database connection and run migrations
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        let db_path = get_database_path(app_handle);

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).expect("Failed to create database directory");
        }

        let conn = Connection::open(&db_path)?;

        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        let db = Database { conn };

        // Run migrations
        db.run_migrations()?;

        Ok(db)
    }

    /// Create database from existing connection (for testing)
    #[cfg(test)]
    pub fn new_from_connection(conn: Connection) -> Self {
        Database { conn }
    }

    /// Get the database connection
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    /// Run all database migrations
    fn run_migrations(&self) -> Result<()> {
        // Read and execute schema.sql
        let schema_sql = include_str!("schema.sql");
        self.conn.execute_batch(schema_sql)?;

        // Add version tracking
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            [],
        )?;

        // Check current version
        let current_version: i32 = self
            .conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_version",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // Apply migrations if needed
        if current_version < 1 {
            self.apply_migration_v1()?;
        }

        Ok(())
    }

    /// Migration version 1: Initial schema
    fn apply_migration_v1(&self) -> Result<()> {
        // Schema is already created by schema.sql
        // Just mark as applied
        self.conn
            .execute("INSERT INTO schema_version (version) VALUES (?1)", [1])?;

        println!("Applied migration v1: Initial schema");
        Ok(())
    }
}

/// Get the database file path based on the platform
fn get_database_path(app_handle: &AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    app_data_dir.join("task_reminder.db")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_path() {
        // This test would require a mock AppHandle
        // For now, it's a placeholder for future testing
    }
}
