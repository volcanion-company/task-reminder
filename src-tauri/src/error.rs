use serde::Serialize;
use thiserror::Error;

/// Domain-specific errors for business rule violations
#[derive(Error, Debug)]
pub enum DomainError {
    /// Task validation failed
    #[error("Task validation failed: {0}")]
    ValidationError(String),

    /// Invalid status transition
    #[error("Invalid status transition from {from} to {to}: {reason}")]
    InvalidStatusTransition {
        from: String,
        to: String,
        reason: String,
    },

    /// Task not found
    #[error("Task with id '{0}' not found")]
    TaskNotFound(String),

    /// Task cannot be modified (terminal state)
    #[error("Task cannot be modified: {0}")]
    TaskNotModifiable(String),

    /// Business rule violation
    #[error("Business rule violation: {0}")]
    BusinessRuleViolation(String),

    /// Invalid date/time
    #[error("Invalid date/time: {0}")]
    InvalidDateTime(String),

    /// Invalid input
    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

/// Result type for domain operations
pub type DomainResult<T> = Result<T, DomainError>;

/// Application-level errors for Tauri commands
/// This wraps domain errors and adds infrastructure-level errors
#[derive(Error, Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    /// Domain/business logic error
    #[error("{0}")]
    Domain(String),

    /// Database connection/lock error
    #[error("Database error: {0}")]
    DatabaseLock(String),

    /// Database operation error
    #[error("Database operation failed: {0}")]
    DatabaseOperation(String),

    /// Not found error
    #[error("Resource not found: {0}")]
    NotFound(String),

    /// Internal server error
    #[error("Internal error: {0}")]
    Internal(String),
}

/// Convert DomainError to AppError
impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::TaskNotFound(msg) => AppError::NotFound(msg),
            other => AppError::Domain(other.to_string()),
        }
    }
}

/// Convert rusqlite::Error to AppError
impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::DatabaseOperation(err.to_string())
    }
}

/// Convert to String for Tauri command compatibility
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
