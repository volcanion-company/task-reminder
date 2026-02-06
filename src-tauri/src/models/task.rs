use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Task status enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

impl TaskStatus {
    pub fn as_str(&self) -> &str {
        match self {
            TaskStatus::Pending => "pending",
            TaskStatus::InProgress => "in_progress",
            TaskStatus::Completed => "completed",
            TaskStatus::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(TaskStatus::Pending),
            "in_progress" => Some(TaskStatus::InProgress),
            "completed" => Some(TaskStatus::Completed),
            "cancelled" => Some(TaskStatus::Cancelled),
            _ => None,
        }
    }

    /// Check if this status is a terminal state (cannot transition further)
    pub fn is_terminal(&self) -> bool {
        matches!(self, TaskStatus::Completed | TaskStatus::Cancelled)
    }

    /// Check if transition from current status to new status is valid
    pub fn can_transition_to(&self, new_status: &TaskStatus) -> bool {
        match (self, new_status) {
            // Terminal states cannot transition
            (TaskStatus::Completed, _) | (TaskStatus::Cancelled, _) => false,
            // Pending can go anywhere
            (TaskStatus::Pending, _) => true,
            // InProgress can complete or be cancelled
            (TaskStatus::InProgress, TaskStatus::Completed) => true,
            (TaskStatus::InProgress, TaskStatus::Cancelled) => true,
            (TaskStatus::InProgress, TaskStatus::Pending) => true,
            // Invalid transitions
            _ => false,
        }
    }

    /// Get human-readable description of status
    pub fn description(&self) -> &str {
        match self {
            TaskStatus::Pending => "Task is waiting to be started",
            TaskStatus::InProgress => "Task is currently being worked on",
            TaskStatus::Completed => "Task has been completed",
            TaskStatus::Cancelled => "Task has been cancelled",
        }
    }
}

/// Task priority enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TaskPriority {
    Low,
    Medium,
    High,
    Urgent,
}

impl TaskPriority {
    pub fn as_str(&self) -> &str {
        match self {
            TaskPriority::Low => "low",
            TaskPriority::Medium => "medium",
            TaskPriority::High => "high",
            TaskPriority::Urgent => "urgent",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "low" => Some(TaskPriority::Low),
            "medium" => Some(TaskPriority::Medium),
            "high" => Some(TaskPriority::High),
            "urgent" => Some(TaskPriority::Urgent),
            _ => None,
        }
    }
}

/// Task entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: TaskStatus,
    pub priority: TaskPriority,
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub image_path: Option<String>,
    pub notes: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub actual_minutes: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub tags: Vec<Tag>,
}

impl Task {
    /// Check if the task is overdue based on current time
    pub fn is_overdue(&self) -> bool {
        if let Some(due_date) = self.due_date {
            // Task is overdue if it has a due date in the past and is not completed/cancelled
            Utc::now() > due_date && !self.status.is_terminal()
        } else {
            false
        }
    }

    /// Check if task is completed
    pub fn is_completed(&self) -> bool {
        self.status == TaskStatus::Completed
    }

    /// Check if task can be modified (not in terminal state)
    pub fn is_modifiable(&self) -> bool {
        !self.status.is_terminal()
    }

    /// Get the effective status considering overdue state
    pub fn effective_status(&self) -> EffectiveTaskStatus {
        if self.is_completed() {
            EffectiveTaskStatus::Done
        } else if self.is_overdue() {
            EffectiveTaskStatus::Overdue
        } else {
            match self.status {
                TaskStatus::Pending => EffectiveTaskStatus::Pending,
                TaskStatus::InProgress => EffectiveTaskStatus::InProgress,
                TaskStatus::Cancelled => EffectiveTaskStatus::Cancelled,
                _ => EffectiveTaskStatus::Pending,
            }
        }
    }

    /// Validate task business rules
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        // Title must not be empty and within length limits
        if self.title.trim().is_empty() {
            errors.push("Title cannot be empty".to_string());
        }
        if self.title.len() > 200 {
            errors.push("Title cannot exceed 200 characters".to_string());
        }

        // Description length limit
        if let Some(desc) = &self.description {
            if desc.len() > 2000 {
                errors.push("Description cannot exceed 2000 characters".to_string());
            }
        }

        // Due date must be in the future for new tasks
        if let Some(due_date) = self.due_date {
            if due_date < self.created_at {
                errors.push("Due date cannot be before creation date".to_string());
            }
        }

        // Estimated minutes must be positive
        if let Some(estimated) = self.estimated_minutes {
            if estimated <= 0 {
                errors.push("Estimated minutes must be positive".to_string());
            }
        }

        // Actual minutes must be positive
        if let Some(actual) = self.actual_minutes {
            if actual <= 0 {
                errors.push("Actual minutes must be positive".to_string());
            }
        }

        // Completed tasks must have completed_at timestamp
        if self.status == TaskStatus::Completed && self.completed_at.is_none() {
            errors.push("Completed task must have completion timestamp".to_string());
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Effective task status including computed "Overdue" state
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum EffectiveTaskStatus {
    Pending,
    InProgress,
    Done,
    Overdue,
    Cancelled,
}

/// Tag entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: DateTime<Utc>,
}

/// Create task DTO (Data Transfer Object)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskDto {
    pub title: String,
    pub description: Option<String>,
    pub priority: TaskPriority,
    pub due_date: Option<DateTime<Utc>>,
    pub image_path: Option<String>,
    pub notes: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub tag_ids: Vec<String>,
}

/// Update task DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskDto {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub due_date: Option<DateTime<Utc>>,
    pub image_path: Option<String>,
    pub notes: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub actual_minutes: Option<i32>,
    pub tag_ids: Option<Vec<String>>,
}

/// Task query filters
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TaskFilter {
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub tag_ids: Option<Vec<String>>,
    pub search: Option<String>,
    pub due_before: Option<DateTime<Utc>>,
    pub due_after: Option<DateTime<Utc>>,
}

/// Sorting options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskSort {
    pub field: TaskSortField,
    pub direction: SortDirection,
}

/// Sort field enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskSortField {
    Title,
    Status,
    Priority,
    DueDate,
    CreatedAt,
    UpdatedAt,
}

impl TaskSortField {
    pub fn as_str(&self) -> &str {
        match self {
            TaskSortField::Title => "title",
            TaskSortField::Status => "status",
            TaskSortField::Priority => "priority",
            TaskSortField::DueDate => "due_date",
            TaskSortField::CreatedAt => "created_at",
            TaskSortField::UpdatedAt => "updated_at",
        }
    }
}

/// Sort direction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SortDirection {
    Asc,
    Desc,
}

impl SortDirection {
    pub fn as_str(&self) -> &str {
        match self {
            SortDirection::Asc => "ASC",
            SortDirection::Desc => "DESC",
        }
    }
}

/// Pagination parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pagination {
    pub page: u32,
    pub page_size: u32,
}

impl Default for Pagination {
    fn default() -> Self {
        Self {
            page: 1,
            page_size: 20,
        }
    }
}

impl Pagination {
    pub fn offset(&self) -> u32 {
        (self.page - 1) * self.page_size
    }
}

/// Paginated response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

impl<T> PaginatedResponse<T> {
    pub fn new(items: Vec<T>, total: u32, pagination: Pagination) -> Self {
        let total_pages = (total as f32 / pagination.page_size as f32).ceil() as u32;
        Self {
            items,
            total,
            page: pagination.page,
            page_size: pagination.page_size,
            total_pages,
        }
    }
}
