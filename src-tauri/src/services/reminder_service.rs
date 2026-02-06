use crate::db::Database;
use crate::error::{DomainError, DomainResult};
use crate::models::{CreateReminderDto, Reminder, RepeatInterval, UpdateReminderDto};
use crate::repositories::ReminderRepository;
use chrono::{DateTime, Utc};

/// Service layer for reminder business logic
pub struct ReminderService<'a> {
    db: &'a Database,
}

impl<'a> ReminderService<'a> {
    /// Create a new ReminderService instance
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Create a new reminder with business rule validation
    ///
    /// Business rules:
    /// - Title must not be empty and <= 200 chars
    /// - Description <= 1000 chars
    /// - remind_at must be in the future
    pub fn create_reminder(&self, mut dto: CreateReminderDto) -> DomainResult<Reminder> {
        // Validate title
        dto.title = dto.title.trim().to_string();
        if dto.title.is_empty() {
            return Err(DomainError::ValidationError(
                "Title cannot be empty".to_string(),
            ));
        }
        if dto.title.len() > 200 {
            return Err(DomainError::ValidationError(
                "Title cannot exceed 200 characters".to_string(),
            ));
        }

        // Validate description
        if let Some(desc) = &dto.description {
            if desc.len() > 1000 {
                return Err(DomainError::ValidationError(
                    "Description cannot exceed 1000 characters".to_string(),
                ));
            }
        }

        // Validate remind_at (must be in the future)
        if dto.remind_at <= Utc::now() {
            return Err(DomainError::InvalidDateTime(
                "Reminder time must be in the future".to_string(),
            ));
        }

        // Create reminder via repository
        let repo = ReminderRepository::new(self.db);
        repo.create(dto).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to create reminder: {}", e))
        })
    }

    /// Update an existing reminder
    pub fn update_reminder(&self, id: &str, dto: UpdateReminderDto) -> DomainResult<Reminder> {
        let repo = ReminderRepository::new(self.db);

        // Fetch existing reminder
        let _existing = repo
            .find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .ok_or_else(|| DomainError::TaskNotFound(id.to_string()))?;

        // Validate title if provided
        if let Some(title) = &dto.title {
            let trimmed = title.trim();
            if trimmed.is_empty() {
                return Err(DomainError::ValidationError(
                    "Title cannot be empty".to_string(),
                ));
            }
            if trimmed.len() > 200 {
                return Err(DomainError::ValidationError(
                    "Title cannot exceed 200 characters".to_string(),
                ));
            }
        }

        // Validate description if provided
        if let Some(desc) = &dto.description {
            if desc.len() > 1000 {
                return Err(DomainError::ValidationError(
                    "Description cannot exceed 1000 characters".to_string(),
                ));
            }
        }

        // Validate remind_at if provided
        if let Some(remind_at) = dto.remind_at {
            if remind_at <= Utc::now() {
                return Err(DomainError::InvalidDateTime(
                    "Reminder time must be in the future".to_string(),
                ));
            }
        }

        // Update reminder via repository
        repo.update(id, dto).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to update reminder: {}", e))
        })
    }

    /// Delete a reminder
    pub fn delete_reminder(&self, id: &str) -> DomainResult<bool> {
        let repo = ReminderRepository::new(self.db);

        // Check if reminder exists
        let exists = repo
            .find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .is_some();

        if !exists {
            return Err(DomainError::TaskNotFound(id.to_string()));
        }

        // Delete reminder
        repo.delete(id).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to delete reminder: {}", e))
        })
    }

    /// Get a reminder by ID
    pub fn get_reminder(&self, id: &str) -> DomainResult<Reminder> {
        let repo = ReminderRepository::new(self.db);
        repo.find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .ok_or_else(|| DomainError::TaskNotFound(id.to_string()))
    }

    /// Get all reminders
    pub fn get_all_reminders(&self) -> DomainResult<Vec<Reminder>> {
        let repo = ReminderRepository::new(self.db);
        repo.find_all().map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to fetch reminders: {}", e))
        })
    }

    /// Get reminders for a specific task
    pub fn get_reminders_by_task(&self, task_id: &str) -> DomainResult<Vec<Reminder>> {
        let repo = ReminderRepository::new(self.db);
        repo.find_by_task_id(task_id).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to fetch reminders: {}", e))
        })
    }

    /// Get all reminders or filter by task_id if provided
    pub fn get_reminders(&self, task_id: Option<&str>) -> DomainResult<Vec<Reminder>> {
        let repo = ReminderRepository::new(self.db);

        if let Some(tid) = task_id {
            repo.find_by_task_id(tid).map_err(|e| {
                DomainError::BusinessRuleViolation(format!("Failed to fetch reminders: {}", e))
            })
        } else {
            repo.find_all().map_err(|e| {
                DomainError::BusinessRuleViolation(format!("Failed to fetch all reminders: {}", e))
            })
        }
    }

    /// Get all reminders that are currently due
    /// Used by notification service to check what should fire
    pub fn get_due_reminders(&self) -> DomainResult<Vec<Reminder>> {
        let repo = ReminderRepository::new(self.db);
        repo.find_due_reminders().map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to fetch due reminders: {}", e))
        })
    }

    /// Mark a reminder as triggered
    /// Updates last_triggered_at timestamp
    pub fn mark_as_triggered(&self, id: &str) -> DomainResult<Reminder> {
        let repo = ReminderRepository::new(self.db);

        // Get the reminder first
        let reminder = repo
            .find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .ok_or_else(|| DomainError::TaskNotFound(id.to_string()))?;

        // If non-repeating, deactivate it after triggering
        if !reminder.repeat_interval.is_repeating() {
            repo.mark_as_triggered(id)
                .and_then(|_| repo.deactivate(id))
                .map_err(|e| {
                    DomainError::BusinessRuleViolation(format!("Failed to mark triggered: {}", e))
                })
        } else {
            // For repeating reminders, just update last_triggered_at
            repo.mark_as_triggered(id).map_err(|e| {
                DomainError::BusinessRuleViolation(format!("Failed to mark triggered: {}", e))
            })?;

            // Return the updated reminder
            repo.find_by_id(id)
                .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
                .ok_or_else(|| DomainError::TaskNotFound(id.to_string()))
        }
    }

    /// Deactivate a reminder (disable it)
    pub fn deactivate_reminder(&self, id: &str) -> DomainResult<Reminder> {
        let repo = ReminderRepository::new(self.db);
        repo.deactivate(id).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to deactivate reminder: {}", e))
        })
    }

    /// Activate a reminder (enable it)
    pub fn activate_reminder(&self, id: &str) -> DomainResult<Reminder> {
        let repo = ReminderRepository::new(self.db);
        repo.activate(id).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to activate reminder: {}", e))
        })
    }

    /// Get count of active reminders
    pub fn count_active_reminders(&self) -> DomainResult<u32> {
        let repo = ReminderRepository::new(self.db);
        repo.count_active().map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to count reminders: {}", e))
        })
    }

    /// Snooze a reminder (postpone by duration)
    /// Creates a new reminder time based on repeat interval or default duration
    pub fn snooze_reminder(&self, id: &str, snooze_minutes: Option<i64>) -> DomainResult<Reminder> {
        use chrono::Duration;

        let repo = ReminderRepository::new(self.db);

        // Get existing reminder
        let reminder = repo
            .find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .ok_or_else(|| DomainError::TaskNotFound(id.to_string()))?;

        // Calculate new remind_at time
        let snooze_duration = if let Some(minutes) = snooze_minutes {
            Duration::minutes(minutes)
        } else {
            // Default snooze: 15 minutes
            Duration::minutes(15)
        };

        let new_remind_at = Utc::now() + snooze_duration;

        // Update reminder
        let update_dto = UpdateReminderDto {
            title: None,
            description: None,
            remind_at: Some(new_remind_at),
            repeat_interval: None,
            is_active: Some(true),
        };

        repo.update(id, update_dto).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to snooze reminder: {}", e))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    fn setup_test_db() -> Database {
        let conn = rusqlite::Connection::open_in_memory().unwrap();

        // Create reminders table schema
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
    fn test_create_reminder_success() {
        let db = setup_test_db();
        let service = ReminderService::new(&db);

        let future_time = Utc::now() + Duration::hours(1);
        let dto = CreateReminderDto {
            task_id: Some("task-1".to_string()),
            title: "Test Reminder".to_string(),
            description: Some("Test description".to_string()),
            remind_at: future_time,
            repeat_interval: RepeatInterval::none(),
        };

        let result = service.create_reminder(dto);
        assert!(result.is_ok());

        let reminder = result.unwrap();
        assert_eq!(reminder.title, "Test Reminder");
        assert_eq!(reminder.description, Some("Test description".to_string()));
    }

    #[test]
    fn test_create_reminder_validates_empty_title() {
        let db = setup_test_db();
        let service = ReminderService::new(&db);

        let future_time = Utc::now() + Duration::hours(1);
        let dto = CreateReminderDto {
            task_id: None,
            title: "   ".to_string(), // Whitespace only
            description: None,
            remind_at: future_time,
            repeat_interval: RepeatInterval::none(),
        };

        let result = service.create_reminder(dto);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            DomainError::ValidationError(_)
        ));
    }

    #[test]
    fn test_create_reminder_validates_title_length() {
        let db = setup_test_db();
        let service = ReminderService::new(&db);

        let future_time = Utc::now() + Duration::hours(1);
        let long_title = "A".repeat(201); // Over 200 chars
        let dto = CreateReminderDto {
            task_id: None,
            title: long_title,
            description: None,
            remind_at: future_time,
            repeat_interval: RepeatInterval::none(),
        };

        let result = service.create_reminder(dto);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            DomainError::ValidationError(_)
        ));
    }

    #[test]
    fn test_create_reminder_validates_past_time() {
        let db = setup_test_db();
        let service = ReminderService::new(&db);

        let past_time = Utc::now() - Duration::hours(1); // Past time
        let dto = CreateReminderDto {
            task_id: None,
            title: "Test".to_string(),
            description: None,
            remind_at: past_time,
            repeat_interval: RepeatInterval::none(),
        };

        let result = service.create_reminder(dto);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            DomainError::InvalidDateTime(_)
        ));
    }

    #[test]
    fn test_delete_reminder_success() {
        let db = setup_test_db();
        let service = ReminderService::new(&db);

        // Create a reminder first
        let future_time = Utc::now() + Duration::hours(1);
        let dto = CreateReminderDto {
            task_id: None,
            title: "To Delete".to_string(),
            description: None,
            remind_at: future_time,
            repeat_interval: RepeatInterval::none(),
        };
        let reminder = service.create_reminder(dto).unwrap();

        // Delete it
        let result = service.delete_reminder(&reminder.id);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);

        // Verify it's gone
        let get_result = service.get_reminder(&reminder.id);
        assert!(get_result.is_err());
    }

    #[test]
    fn test_update_reminder_validates_title() {
        let db = setup_test_db();
        let service = ReminderService::new(&db);

        // Create a reminder
        let future_time = Utc::now() + Duration::hours(1);
        let dto = CreateReminderDto {
            task_id: None,
            title: "Original".to_string(),
            description: None,
            remind_at: future_time,
            repeat_interval: RepeatInterval::none(),
        };
        let reminder = service.create_reminder(dto).unwrap();

        // Try to update with empty title
        let update_dto = UpdateReminderDto {
            title: Some("   ".to_string()), // Whitespace
            description: None,
            remind_at: None,
            repeat_interval: None,
            is_active: None,
        };

        let result = service.update_reminder(&reminder.id, update_dto);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            DomainError::ValidationError(_)
        ));
    }

    #[test]
    fn test_snooze_reminder() {
        let db = setup_test_db();
        let service = ReminderService::new(&db);

        // Create a reminder 1 hour in the future
        let future_time = Utc::now() + Duration::hours(1);
        let dto = CreateReminderDto {
            task_id: None,
            title: "To Snooze".to_string(),
            description: None,
            remind_at: future_time,
            repeat_interval: RepeatInterval::none(),
        };
        let reminder = service.create_reminder(dto).unwrap();

        // Snooze by 30 minutes - should reschedule to NOW + 30 minutes
        let before_snooze = Utc::now();
        let result = service.snooze_reminder(&reminder.id, Some(30));
        assert!(result.is_ok());

        let snoozed = result.unwrap();
        // After snooze, remind_at should be ~30 minutes from NOW, not from original_time
        // It could be slightly before original_time if original was >30 minutes away
        let expected_time = before_snooze + Duration::minutes(30);

        // Allow 1 second tolerance for test execution time
        let time_diff = (snoozed.remind_at - expected_time).num_seconds().abs();
        assert!(
            time_diff < 1,
            "Expected remind_at to be ~30 minutes from now, got {} seconds difference",
            time_diff
        );
        assert!(snoozed.is_active);
    }
}
