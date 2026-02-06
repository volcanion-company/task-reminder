use crate::db::Database;
use crate::models::{CreateReminderDto, Reminder, RepeatInterval, UpdateReminderDto};
use chrono::{DateTime, Utc};
use rusqlite::{params, Result, Row};
use uuid::Uuid;

/// Repository for reminder data access
pub struct ReminderRepository<'a> {
    db: &'a Database,
}

impl<'a> ReminderRepository<'a> {
    /// Create a new ReminderRepository instance
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Create a new reminder
    pub fn create(&self, dto: CreateReminderDto) -> Result<Reminder> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let conn = self.db.connection();

        conn.execute(
            "INSERT INTO reminders (
                id, task_id, title, description, remind_at, 
                repeat_interval, is_active, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                id,
                dto.task_id,
                dto.title,
                dto.description,
                dto.remind_at.to_rfc3339(),
                dto.repeat_interval.as_str(),
                1, // is_active = true by default
                now.to_rfc3339(),
                now.to_rfc3339(),
            ],
        )?;

        // Fetch and return the created reminder
        self.find_by_id(&id)
            .and_then(|opt| opt.ok_or(rusqlite::Error::QueryReturnedNoRows))
    }

    /// Find reminder by ID
    pub fn find_by_id(&self, id: &str) -> Result<Option<Reminder>> {
        let conn = self.db.connection();

        let mut stmt = conn.prepare(
            "SELECT id, task_id, title, description, remind_at, 
                    repeat_interval, is_active, last_triggered_at, 
                    created_at, updated_at
             FROM reminders 
             WHERE id = ?1",
        )?;

        let reminder_result = stmt.query_row(params![id], |row| self.map_row_to_reminder(row));

        match reminder_result {
            Ok(reminder) => Ok(Some(reminder)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Update a reminder
    pub fn update(&self, id: &str, dto: UpdateReminderDto) -> Result<Reminder> {
        let conn = self.db.connection();

        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(title) = &dto.title {
            updates.push("title = ?");
            params.push(Box::new(title.clone()));
        }
        if let Some(description) = &dto.description {
            updates.push("description = ?");
            params.push(Box::new(description.clone()));
        }
        if let Some(remind_at) = &dto.remind_at {
            updates.push("remind_at = ?");
            params.push(Box::new(remind_at.to_rfc3339()));
        }
        if let Some(repeat_interval) = &dto.repeat_interval {
            updates.push("repeat_interval = ?");
            params.push(Box::new(repeat_interval.as_str().to_string()));
        }
        if let Some(is_active) = dto.is_active {
            updates.push("is_active = ?");
            params.push(Box::new(if is_active { 1 } else { 0 }));
        }

        if updates.is_empty() {
            return self
                .find_by_id(id)?
                .ok_or(rusqlite::Error::QueryReturnedNoRows);
        }

        let query = format!("UPDATE reminders SET {} WHERE id = ?", updates.join(", "));
        params.push(Box::new(id.to_string()));

        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        conn.execute(&query, param_refs.as_slice())?;

        // Fetch and return updated reminder
        self.find_by_id(id)?
            .ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    /// Delete a reminder
    pub fn delete(&self, id: &str) -> Result<bool> {
        let conn = self.db.connection();
        let rows_affected = conn.execute("DELETE FROM reminders WHERE id = ?1", params![id])?;
        Ok(rows_affected > 0)
    }

    /// Find all reminders
    pub fn find_all(&self) -> Result<Vec<Reminder>> {
        let conn = self.db.connection();

        let mut stmt = conn.prepare(
            "SELECT id, task_id, title, description, remind_at, 
                    repeat_interval, is_active, last_triggered_at, 
                    created_at, updated_at
             FROM reminders 
             ORDER BY remind_at ASC",
        )?;

        let reminders = stmt
            .query_map([], |row| self.map_row_to_reminder(row))?
            .collect::<Result<Vec<Reminder>>>()?;

        Ok(reminders)
    }

    /// Find reminders by task ID
    pub fn find_by_task_id(&self, task_id: &str) -> Result<Vec<Reminder>> {
        let conn = self.db.connection();

        let mut stmt = conn.prepare(
            "SELECT id, task_id, title, description, remind_at, 
                    repeat_interval, is_active, last_triggered_at, 
                    created_at, updated_at
             FROM reminders 
             WHERE task_id = ?1
             ORDER BY remind_at ASC",
        )?;

        let reminders = stmt
            .query_map(params![task_id], |row| self.map_row_to_reminder(row))?
            .collect::<Result<Vec<Reminder>>>()?;

        Ok(reminders)
    }

    /// Deactivate a reminder (set is_active to false)
    pub fn deactivate(&self, id: &str) -> Result<Reminder> {
        let conn = self.db.connection();

        conn.execute(
            "UPDATE reminders SET is_active = 0 WHERE id = ?1",
            params![id],
        )?;

        self.find_by_id(id)?
            .ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    /// Activate a reminder (set is_active to true)
    pub fn activate(&self, id: &str) -> Result<Reminder> {
        let conn = self.db.connection();

        conn.execute(
            "UPDATE reminders SET is_active = 1 WHERE id = ?1",
            params![id],
        )?;

        self.find_by_id(id)?
            .ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    /// Count active reminders
    pub fn count_active(&self) -> Result<u32> {
        let conn = self.db.connection();
        let count: u32 = conn.query_row(
            "SELECT COUNT(*) FROM reminders WHERE is_active = 1",
            [],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    /// Find reminders that are due to be triggered
    pub fn find_due_reminders(&self) -> Result<Vec<Reminder>> {
        let conn = self.db.connection();
        let now = Utc::now().to_rfc3339();

        let mut stmt = conn.prepare(
            "SELECT id, task_id, title, description, remind_at, 
                    repeat_interval, is_active, last_triggered_at, 
                    created_at, updated_at
             FROM reminders
             WHERE is_active = 1 
               AND remind_at <= ?1
               AND (last_triggered_at IS NULL 
                    OR last_triggered_at < datetime('now', '-1 minute'))
             ORDER BY remind_at ASC",
        )?;

        let reminder_iter = stmt.query_map(params![now], |row| self.map_row_to_reminder(row))?;

        let mut reminders = Vec::new();
        for reminder_result in reminder_iter {
            if let Ok(reminder) = reminder_result {
                // Check if reminder is actually due using business logic
                if reminder.is_due() {
                    reminders.push(reminder);
                }
            }
        }

        Ok(reminders)
    }

    /// Mark reminder as triggered (update last_triggered_at)
    pub fn mark_as_triggered(&self, id: &str) -> Result<()> {
        let conn = self.db.connection();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE reminders SET last_triggered_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        Ok(())
    }

    /// Update next trigger time for repeating reminders
    pub fn update_next_trigger_time(&self, id: &str, next_trigger: &DateTime<Utc>) -> Result<()> {
        let conn = self.db.connection();
        let next_trigger_str = next_trigger.to_rfc3339();

        conn.execute(
            "UPDATE reminders SET remind_at = ?1, updated_at = ?2 WHERE id = ?3",
            params![next_trigger_str, Utc::now().to_rfc3339(), id],
        )?;

        Ok(())
    }

    // ========================================================================
    // Private helper methods
    // ========================================================================

    /// Map database row to Reminder struct
    fn map_row_to_reminder(&self, row: &Row) -> Result<Reminder> {
        let repeat_interval_str: String = row.get(5)?;
        let is_active_int: i32 = row.get(6)?;

        let remind_at: String = row.get(4)?;
        let last_triggered_at: Option<String> = row.get(7)?;
        let created_at: String = row.get(8)?;
        let updated_at: String = row.get(9)?;

        Ok(Reminder {
            id: row.get(0)?,
            task_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            remind_at: DateTime::parse_from_rfc3339(&remind_at)
                .map(|d| d.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            repeat_interval: RepeatInterval::from_str(&repeat_interval_str),
            is_active: is_active_int != 0,
            last_triggered_at: last_triggered_at
                .and_then(|d| DateTime::parse_from_rfc3339(&d).ok())
                .map(|d| d.with_timezone(&Utc)),
            created_at: DateTime::parse_from_rfc3339(&created_at)
                .map(|d| d.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            updated_at: DateTime::parse_from_rfc3339(&updated_at)
                .map(|d| d.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{CreateReminderDto, RepeatInterval, UpdateReminderDto};
    use rusqlite::Connection;

    fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();

        // Create reminders table
        conn.execute(
            "CREATE TABLE reminders (
                id TEXT PRIMARY KEY,
                task_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                remind_at TEXT NOT NULL,
                repeat_interval TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                last_triggered_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .unwrap();

        Database::new_from_connection(conn)
    }

    #[test]
    fn test_create_reminder() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let remind_at = Utc::now() + chrono::Duration::hours(1);
        let dto = CreateReminderDto {
            task_id: Some("task-123".to_string()),
            title: "Test Reminder".to_string(),
            description: Some("Test Description".to_string()),
            remind_at,
            repeat_interval: RepeatInterval::none(),
        };

        let reminder = repo.create(dto).unwrap();

        assert_eq!(reminder.title, "Test Reminder");
        assert_eq!(reminder.description, Some("Test Description".to_string()));
        assert_eq!(reminder.task_id, Some("task-123".to_string()));
        assert_eq!(reminder.repeat_interval, RepeatInterval::none());
        assert!(reminder.is_active);
        assert!(reminder.last_triggered_at.is_none());
    }

    #[test]
    fn test_create_reminder_without_task() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let remind_at = Utc::now() + chrono::Duration::days(1);
        let dto = CreateReminderDto {
            task_id: None,
            title: "Standalone Reminder".to_string(),
            description: None,
            remind_at,
            repeat_interval: RepeatInterval::from_str("daily"),
        };

        let reminder = repo.create(dto).unwrap();

        assert_eq!(reminder.title, "Standalone Reminder");
        assert_eq!(reminder.task_id, None);
        assert_eq!(reminder.repeat_interval, RepeatInterval::from_str("daily"));
    }

    #[test]
    fn test_find_by_id() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let remind_at = Utc::now() + chrono::Duration::hours(2);
        let dto = CreateReminderDto {
            task_id: Some("task-456".to_string()),
            title: "Find Me".to_string(),
            description: Some("Test".to_string()),
            remind_at,
            repeat_interval: RepeatInterval::from_str("weekly"),
        };

        let created = repo.create(dto).unwrap();
        let found = repo.find_by_id(&created.id).unwrap();

        assert!(found.is_some());
        let reminder = found.unwrap();
        assert_eq!(reminder.id, created.id);
        assert_eq!(reminder.title, "Find Me");
        assert_eq!(reminder.repeat_interval, RepeatInterval::from_str("weekly"));
    }

    #[test]
    fn test_find_by_id_not_found() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let result = repo.find_by_id("non-existent-id").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_update_reminder_title() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let remind_at = Utc::now() + chrono::Duration::hours(3);
        let dto = CreateReminderDto {
            task_id: None,
            title: "Original Title".to_string(),
            description: None,
            remind_at,
            repeat_interval: RepeatInterval::none(),
        };

        let created = repo.create(dto).unwrap();

        let update = UpdateReminderDto {
            title: Some("Updated Title".to_string()),
            description: None,
            remind_at: None,
            repeat_interval: None,
            is_active: None,
        };

        let updated = repo.update(&created.id, update).unwrap();
        assert_eq!(updated.title, "Updated Title");
    }

    #[test]
    fn test_update_reminder_repeat_interval() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let remind_at = Utc::now() + chrono::Duration::hours(4);
        let dto = CreateReminderDto {
            task_id: None,
            title: "Reminder".to_string(),
            description: None,
            remind_at,
            repeat_interval: RepeatInterval::none(),
        };

        let created = repo.create(dto).unwrap();
        assert_eq!(created.repeat_interval, RepeatInterval::none());

        let update = UpdateReminderDto {
            title: None,
            description: None,
            remind_at: None,
            repeat_interval: Some(RepeatInterval::from_str("monthly")),
            is_active: None,
        };

        let updated = repo.update(&created.id, update).unwrap();
        assert_eq!(updated.repeat_interval, RepeatInterval::from_str("monthly"));
    }

    #[test]
    fn test_delete_reminder() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let remind_at = Utc::now() + chrono::Duration::hours(5);
        let dto = CreateReminderDto {
            task_id: None,
            title: "Delete Me".to_string(),
            description: None,
            remind_at,
            repeat_interval: RepeatInterval::none(),
        };

        let created = repo.create(dto).unwrap();
        let deleted = repo.delete(&created.id).unwrap();

        assert!(deleted);

        let found = repo.find_by_id(&created.id).unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_delete_nonexistent_reminder() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let deleted = repo.delete("non-existent-id").unwrap();
        assert!(!deleted);
    }

    #[test]
    fn test_find_all() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        // Create multiple reminders
        for i in 1..=3 {
            let remind_at = Utc::now() + chrono::Duration::hours(i);
            let dto = CreateReminderDto {
                task_id: Some(format!("task-{}", i)),
                title: format!("Reminder {}", i),
                description: None,
                remind_at,
                repeat_interval: RepeatInterval::none(),
            };
            repo.create(dto).unwrap();
        }

        let reminders = repo.find_all().unwrap();
        assert_eq!(reminders.len(), 3);

        // Should be ordered by remind_at ASC
        assert_eq!(reminders[0].title, "Reminder 1");
        assert_eq!(reminders[1].title, "Reminder 2");
        assert_eq!(reminders[2].title, "Reminder 3");
    }

    #[test]
    fn test_find_by_task_id() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let task_id = "task-xyz";

        // Create reminders for specific task
        for i in 1..=2 {
            let remind_at = Utc::now() + chrono::Duration::hours(i);
            let dto = CreateReminderDto {
                task_id: Some(task_id.to_string()),
                title: format!("Task Reminder {}", i),
                description: None,
                remind_at,
                repeat_interval: RepeatInterval::none(),
            };
            repo.create(dto).unwrap();
        }

        // Create reminder for different task
        let remind_at = Utc::now() + chrono::Duration::hours(10);
        let dto = CreateReminderDto {
            task_id: Some("other-task".to_string()),
            title: "Other Reminder".to_string(),
            description: None,
            remind_at,
            repeat_interval: RepeatInterval::none(),
        };
        repo.create(dto).unwrap();

        let reminders = repo.find_by_task_id(task_id).unwrap();
        assert_eq!(reminders.len(), 2);
        assert!(reminders
            .iter()
            .all(|r| r.task_id == Some(task_id.to_string())));
    }

    #[test]
    fn test_deactivate_reminder() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let remind_at = Utc::now() + chrono::Duration::hours(6);
        let dto = CreateReminderDto {
            task_id: None,
            title: "Active Reminder".to_string(),
            description: None,
            remind_at,
            repeat_interval: RepeatInterval::none(),
        };

        let created = repo.create(dto).unwrap();
        assert!(created.is_active);

        let deactivated = repo.deactivate(&created.id).unwrap();
        assert!(!deactivated.is_active);
    }

    #[test]
    fn test_activate_reminder() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let remind_at = Utc::now() + chrono::Duration::hours(7);
        let dto = CreateReminderDto {
            task_id: None,
            title: "Reminder".to_string(),
            description: None,
            remind_at,
            repeat_interval: RepeatInterval::none(),
        };

        let created = repo.create(dto).unwrap();

        // Deactivate then reactivate
        repo.deactivate(&created.id).unwrap();
        let activated = repo.activate(&created.id).unwrap();

        assert!(activated.is_active);
    }

    #[test]
    fn test_count_active() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        // Create 3 reminders
        for i in 1..=3 {
            let remind_at = Utc::now() + chrono::Duration::hours(i);
            let dto = CreateReminderDto {
                task_id: None,
                title: format!("Reminder {}", i),
                description: None,
                remind_at,
                repeat_interval: RepeatInterval::none(),
            };
            repo.create(dto).unwrap();
        }

        let count = repo.count_active().unwrap();
        assert_eq!(count, 3);

        // Deactivate one
        let all_reminders = repo.find_all().unwrap();
        repo.deactivate(&all_reminders[0].id).unwrap();

        let count = repo.count_active().unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_mark_as_triggered() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        let remind_at = Utc::now() + chrono::Duration::hours(8);
        let dto = CreateReminderDto {
            task_id: None,
            title: "Trigger Me".to_string(),
            description: None,
            remind_at,
            repeat_interval: RepeatInterval::none(),
        };

        let created = repo.create(dto).unwrap();
        assert!(created.last_triggered_at.is_none());

        repo.mark_as_triggered(&created.id).unwrap();

        let updated = repo.find_by_id(&created.id).unwrap().unwrap();
        assert!(updated.last_triggered_at.is_some());
    }

    #[test]
    fn test_find_due_reminders() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        // Create past reminder (due)
        let past = Utc::now() - chrono::Duration::hours(1);
        let dto1 = CreateReminderDto {
            task_id: None,
            title: "Past Reminder".to_string(),
            description: None,
            remind_at: past,
            repeat_interval: RepeatInterval::none(),
        };
        repo.create(dto1).unwrap();

        // Create future reminder (not due)
        let future = Utc::now() + chrono::Duration::hours(10);
        let dto2 = CreateReminderDto {
            task_id: None,
            title: "Future Reminder".to_string(),
            description: None,
            remind_at: future,
            repeat_interval: RepeatInterval::none(),
        };
        repo.create(dto2).unwrap();

        let due_reminders = repo.find_due_reminders().unwrap();

        // Should only get the past reminder
        assert_eq!(due_reminders.len(), 1);
        assert_eq!(due_reminders[0].title, "Past Reminder");
    }

    #[test]
    fn test_find_due_reminders_excludes_inactive() {
        let db = setup_test_db();
        let repo = ReminderRepository::new(&db);

        // Create past reminder and deactivate it
        let past = Utc::now() - chrono::Duration::hours(2);
        let dto = CreateReminderDto {
            task_id: None,
            title: "Inactive Past Reminder".to_string(),
            description: None,
            remind_at: past,
            repeat_interval: RepeatInterval::none(),
        };
        let created = repo.create(dto).unwrap();
        repo.deactivate(&created.id).unwrap();

        let due_reminders = repo.find_due_reminders().unwrap();

        // Should not include inactive reminders
        assert_eq!(due_reminders.len(), 0);
    }
}
