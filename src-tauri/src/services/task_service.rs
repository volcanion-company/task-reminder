use crate::db::Database;
use crate::error::{DomainError, DomainResult};
use crate::models::{
    CreateTaskDto, EffectiveTaskStatus, Task, TaskPriority, TaskStatus, UpdateTaskDto,
};
use crate::repositories::TaskRepository;
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Service layer for task business logic and domain rules.
///
/// This service acts as the bridge between the API layer (Tauri commands)
/// and the data layer (repositories). It enforces business rules, validates
/// input, and orchestrates complex operations.
///
/// Key responsibilities:
/// - Input validation (title length, date constraints, etc.)
/// - Business rule enforcement (status transitions, etc.)
/// - Coordination of multiple repository operations
/// - Error handling and domain-specific error translation
///
/// Pattern: All public methods return DomainResult<T> for consistent error handling
pub struct TaskService<'a> {
    db: &'a Database,
}

impl<'a> TaskService<'a> {
    /// Create a new TaskService instance bound to a database connection
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Create a new task with comprehensive validation.
    ///
    /// Validates:
    /// - Title must not be empty and <= 200 chars
    /// - Description <= 2000 chars
    /// - Due date must be in the future (if provided)
    /// - Estimated minutes must be positive (if provided)
    pub fn create_task(&self, mut dto: CreateTaskDto) -> DomainResult<Task> {
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
            if desc.len() > 2000 {
                return Err(DomainError::ValidationError(
                    "Description cannot exceed 2000 characters".to_string(),
                ));
            }
        }

        // Validate due date (must be in the future)
        if let Some(due_date) = dto.due_date {
            if due_date <= Utc::now() {
                return Err(DomainError::InvalidDateTime(
                    "Due date must be in the future".to_string(),
                ));
            }
        }

        // Validate estimated minutes
        if let Some(estimated) = dto.estimated_minutes {
            if estimated <= 0 {
                return Err(DomainError::ValidationError(
                    "Estimated minutes must be positive".to_string(),
                ));
            }
        }

        // Validate tag IDs (ensure they're not empty strings)
        dto.tag_ids.retain(|id| !id.trim().is_empty());

        // Create task via repository
        let repo = TaskRepository::new(self.db);
        repo.create(dto).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to create task: {}", e))
        })
    }

    /// Update an existing task with business rule validation
    ///
    /// Business rules:
    /// - Cannot modify completed or cancelled tasks
    /// - Status transitions must be valid
    /// - Same validation as create for other fields
    pub fn update_task(&self, id: &str, dto: UpdateTaskDto) -> DomainResult<Task> {
        let repo = TaskRepository::new(self.db);

        // Fetch existing task
        let existing_task = repo
            .find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .ok_or_else(|| DomainError::TaskNotFound(id.to_string()))?;

        // Check if task can be modified
        if !existing_task.is_modifiable() {
            return Err(DomainError::TaskNotModifiable(format!(
                "Task is in terminal state: {}",
                existing_task.status.as_str()
            )));
        }

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
            if desc.len() > 2000 {
                return Err(DomainError::ValidationError(
                    "Description cannot exceed 2000 characters".to_string(),
                ));
            }
        }

        // Validate status transition if provided
        if let Some(new_status) = &dto.status {
            if !existing_task.status.can_transition_to(new_status) {
                return Err(DomainError::InvalidStatusTransition {
                    from: existing_task.status.as_str().to_string(),
                    to: new_status.as_str().to_string(),
                    reason: "This status transition is not allowed".to_string(),
                });
            }
        }

        // Validate due date if provided
        if let Some(due_date) = dto.due_date {
            // Allow updating to past dates for existing tasks (rescheduling)
            // but warn if it makes the task immediately overdue
            if due_date < existing_task.created_at {
                return Err(DomainError::InvalidDateTime(
                    "Due date cannot be before task creation date".to_string(),
                ));
            }
        }

        // Validate estimated minutes if provided
        if let Some(estimated) = dto.estimated_minutes {
            if estimated <= 0 {
                return Err(DomainError::ValidationError(
                    "Estimated minutes must be positive".to_string(),
                ));
            }
        }

        // Validate actual minutes if provided
        if let Some(actual) = dto.actual_minutes {
            if actual <= 0 {
                return Err(DomainError::ValidationError(
                    "Actual minutes must be positive".to_string(),
                ));
            }
        }

        // Update task via repository
        repo.update(id, dto).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to update task: {}", e))
        })
    }

    /// Mark a task as done (completed)
    ///
    /// Business rules:
    /// - Task must exist
    /// - Task must not already be in terminal state
    /// - Sets completed_at timestamp
    /// - Optionally record actual minutes spent
    pub fn mark_done(&self, id: &str, actual_minutes: Option<i32>) -> DomainResult<Task> {
        let repo = TaskRepository::new(self.db);

        // Fetch existing task
        let existing_task = repo
            .find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .ok_or_else(|| DomainError::TaskNotFound(id.to_string()))?;

        // Check if already completed
        if existing_task.status == TaskStatus::Completed {
            return Ok(existing_task); // Idempotent operation
        }

        // Check if task can be modified
        if !existing_task.is_modifiable() {
            return Err(DomainError::TaskNotModifiable(format!(
                "Task is already in terminal state: {}",
                existing_task.status.as_str()
            )));
        }

        // Validate actual minutes if provided
        if let Some(actual) = actual_minutes {
            if actual <= 0 {
                return Err(DomainError::ValidationError(
                    "Actual minutes must be positive".to_string(),
                ));
            }
        }

        // Update to completed status
        let update_dto = UpdateTaskDto {
            title: None,
            description: None,
            status: Some(TaskStatus::Completed),
            priority: None,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            actual_minutes,
            tag_ids: None,
        };

        repo.update(id, update_dto).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to mark task as done: {}", e))
        })
    }

    /// Delete a task
    ///
    /// Business rules:
    /// - Task must exist
    /// - No restrictions on deletion (can delete completed tasks)
    pub fn delete_task(&self, id: &str) -> DomainResult<bool> {
        let repo = TaskRepository::new(self.db);

        // Check if task exists
        let exists = repo
            .find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .is_some();

        if !exists {
            return Err(DomainError::TaskNotFound(id.to_string()));
        }

        // Delete task
        repo.delete(id).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to delete task: {}", e))
        })
    }

    /// Get a task by ID
    pub fn get_task(&self, id: &str) -> DomainResult<Task> {
        let repo = TaskRepository::new(self.db);
        repo.find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .ok_or_else(|| DomainError::TaskNotFound(id.to_string()))
    }

    /// Search tasks by query string
    ///
    /// Searches in task title and description (case-insensitive)
    pub fn search_tasks(&self, query: &str) -> DomainResult<Vec<Task>> {
        let repo = TaskRepository::new(self.db);

        let pagination = crate::models::Pagination {
            page: 1,
            page_size: 1000,
        };

        let tasks = repo.find_all(None, None, pagination).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to search tasks: {}", e))
        })?;

        let query_lower = query.to_lowercase();
        let filtered: Vec<Task> = tasks
            .items
            .into_iter()
            .filter(|task| {
                task.title.to_lowercase().contains(&query_lower)
                    || task
                        .description
                        .as_ref()
                        .map_or(false, |d| d.to_lowercase().contains(&query_lower))
            })
            .collect();

        Ok(filtered)
    }

    /// Auto-update overdue status for tasks
    ///
    /// This method finds all overdue tasks and returns them for notification purposes.
    /// The "overdue" status is computed, not stored in the database.
    ///
    /// Business rules:
    /// - A task is overdue if:
    ///   - It has a due_date
    ///   - The due_date is in the past
    ///   - The status is not Completed or Cancelled
    pub fn auto_update_overdue_status(&self) -> DomainResult<Vec<Task>> {
        let repo = TaskRepository::new(self.db);

        // Get overdue tasks from repository
        let overdue_tasks = repo.find_overdue().map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to fetch overdue tasks: {}", e))
        })?;

        Ok(overdue_tasks)
    }

    /// Get tasks with their effective status (including computed Overdue)
    pub fn get_tasks_with_effective_status(
        &self,
    ) -> DomainResult<Vec<(Task, EffectiveTaskStatus)>> {
        let repo = TaskRepository::new(self.db);

        // Get all non-terminal tasks
        let tasks = repo
            .find_all(None, None, crate::models::Pagination::default())
            .map_err(|e| {
                DomainError::BusinessRuleViolation(format!("Failed to fetch tasks: {}", e))
            })?;

        // Map to effective status
        let tasks_with_status: Vec<(Task, EffectiveTaskStatus)> = tasks
            .items
            .into_iter()
            .map(|task| {
                let status = task.effective_status();
                (task, status)
            })
            .collect();

        Ok(tasks_with_status)
    }

    /// Transition a task to a new status with validation
    ///
    /// Business rules:
    /// - Status transition must be valid according to state machine
    /// - Cannot transition from terminal states
    pub fn transition_status(&self, id: &str, new_status: TaskStatus) -> DomainResult<Task> {
        let repo = TaskRepository::new(self.db);

        // Fetch existing task
        let existing_task = repo
            .find_by_id(id)
            .map_err(|e| DomainError::BusinessRuleViolation(format!("Database error: {}", e)))?
            .ok_or_else(|| DomainError::TaskNotFound(id.to_string()))?;

        // Validate transition
        if !existing_task.status.can_transition_to(&new_status) {
            return Err(DomainError::InvalidStatusTransition {
                from: existing_task.status.as_str().to_string(),
                to: new_status.as_str().to_string(),
                reason: format!(
                    "Cannot transition from {} to {}. Valid transitions: {}",
                    existing_task.status.as_str(),
                    new_status.as_str(),
                    self.get_valid_transitions(&existing_task.status)
                ),
            });
        }

        // Update status
        let update_dto = UpdateTaskDto {
            title: None,
            description: None,
            status: Some(new_status),
            priority: None,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            actual_minutes: None,
            tag_ids: None,
        };

        repo.update(id, update_dto).map_err(|e| {
            DomainError::BusinessRuleViolation(format!("Failed to transition status: {}", e))
        })
    }

    /// Get valid transition states for a given status
    fn get_valid_transitions(&self, status: &TaskStatus) -> String {
        match status {
            TaskStatus::Pending => "InProgress, Completed, Cancelled".to_string(),
            TaskStatus::InProgress => "Pending, Completed, Cancelled".to_string(),
            TaskStatus::Completed => "None (terminal state)".to_string(),
            TaskStatus::Cancelled => "None (terminal state)".to_string(),
        }
    }

    /// Count tasks by their effective status (including overdue)
    pub fn count_by_effective_status(&self) -> DomainResult<Vec<(EffectiveTaskStatus, usize)>> {
        let tasks_with_status = self.get_tasks_with_effective_status()?;

        // Count by effective status
        let mut counts = std::collections::HashMap::new();
        for (_, status) in tasks_with_status {
            *counts.entry(status).or_insert(0) += 1;
        }

        let result: Vec<(EffectiveTaskStatus, usize)> = counts.into_iter().collect();
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::models::{CreateTaskDto, TaskPriority, TaskStatus, UpdateTaskDto};
    use rusqlite::Connection;

    fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();

        // Create tables matching actual schema
        conn.execute(
            "CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                due_date TEXT,
                completed_at TEXT,
                image_path TEXT,
                notes TEXT,
                estimated_minutes INTEGER,
                actual_minutes INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .unwrap();

        conn.execute(
            "CREATE TABLE task_tags (
                task_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (task_id, tag_id)
            )",
            [],
        )
        .unwrap();

        conn.execute(
            "CREATE TABLE tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )
        .unwrap();

        Database::new_from_connection(conn)
    }

    #[test]
    fn test_status_transitions() {
        // Pending can go to any state
        assert!(TaskStatus::Pending.can_transition_to(&TaskStatus::InProgress));
        assert!(TaskStatus::Pending.can_transition_to(&TaskStatus::Completed));
        assert!(TaskStatus::Pending.can_transition_to(&TaskStatus::Cancelled));

        // InProgress can go to Pending, Completed, or Cancelled
        assert!(TaskStatus::InProgress.can_transition_to(&TaskStatus::Pending));
        assert!(TaskStatus::InProgress.can_transition_to(&TaskStatus::Completed));
        assert!(TaskStatus::InProgress.can_transition_to(&TaskStatus::Cancelled));

        // Terminal states cannot transition
        assert!(!TaskStatus::Completed.can_transition_to(&TaskStatus::Pending));
        assert!(!TaskStatus::Completed.can_transition_to(&TaskStatus::InProgress));
        assert!(!TaskStatus::Cancelled.can_transition_to(&TaskStatus::Pending));
    }

    #[test]
    fn test_terminal_states() {
        assert!(TaskStatus::Completed.is_terminal());
        assert!(TaskStatus::Cancelled.is_terminal());
        assert!(!TaskStatus::Pending.is_terminal());
        assert!(!TaskStatus::InProgress.is_terminal());
    }

    #[test]
    fn test_create_task_success() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        let dto = CreateTaskDto {
            title: "Test Task".to_string(),
            description: Some("Test Description".to_string()),
            priority: TaskPriority::High,
            due_date: None,
            notes: None,
            estimated_minutes: Some(60),
            image_path: None,
            tag_ids: vec![],
        };

        let result = service.create_task(dto);
        assert!(result.is_ok());

        let task = result.unwrap();
        assert_eq!(task.title, "Test Task");
        assert_eq!(task.priority, TaskPriority::High);
        assert_eq!(task.status, TaskStatus::Pending);
    }

    #[test]
    fn test_create_task_validates_title_length() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        // Empty title
        let dto = CreateTaskDto {
            title: "   ".to_string(), // Whitespace only - will be trimmed to empty
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            notes: None,
            estimated_minutes: None,
            image_path: None,
            tag_ids: vec![],
        };

        let result = service.create_task(dto);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            DomainError::ValidationError(_)
        ));
    }

    #[test]
    fn test_delete_task_success() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        // Create a task
        let dto = CreateTaskDto {
            title: "Task to Delete".to_string(),
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            notes: None,
            estimated_minutes: None,
            image_path: None,
            tag_ids: vec![],
        };

        let task = service.create_task(dto).unwrap();

        // Delete it
        let result = service.delete_task(&task.id);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);

        // Verify it's deleted
        let get_result = service.get_task(&task.id);
        assert!(get_result.is_err());
    }
}
