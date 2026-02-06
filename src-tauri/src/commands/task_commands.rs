use crate::db::Database;
use crate::error::AppError;
use crate::models::{
    CreateReminderDto, CreateTaskDto, Task, TaskPriority, TaskStatus, UpdateTaskDto,
};
use crate::repositories::{ReminderRepository, TaskRepository};
use crate::services::TaskService;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskFilters {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tag_id: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskListResponse {
    pub tasks: Vec<Task>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
}

/// Get all tasks with optional filtering
#[tauri::command]
pub async fn get_tasks(
    db_state: State<'_, Arc<Mutex<Database>>>,
    filters: Option<TaskFilters>,
    pagination: Option<PaginationParams>,
) -> Result<TaskListResponse, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let repo = TaskRepository::new(&db);

    let page_params = pagination.unwrap_or(PaginationParams {
        page: 1,
        page_size: 50,
    });

    let pagination = crate::models::Pagination {
        page: page_params.page,
        page_size: page_params.page_size,
    };

    let tasks = repo
        .find_all(
            None, // filter
            None, // sort
            pagination,
        )
        .map_err(|e| e.to_string())?;

    // Filter tasks based on parameters
    let filtered_tasks: Vec<Task> = if let Some(f) = filters {
        tasks
            .items
            .into_iter()
            .filter(|task| {
                let status_match = f.status.as_ref().map_or(true, |s| {
                    task.status.as_str().to_lowercase() == s.to_lowercase()
                });
                let priority_match = f.priority.as_ref().map_or(true, |p| {
                    task.priority.as_str().to_lowercase() == p.to_lowercase()
                });
                let search_match = f.search.as_ref().map_or(true, |q| {
                    let query = q.to_lowercase();
                    task.title.to_lowercase().contains(&query)
                        || task
                            .description
                            .as_ref()
                            .map_or(false, |d| d.to_lowercase().contains(&query))
                });
                let tag_match = f
                    .tag_id
                    .as_ref()
                    .map_or(true, |tag_id| task.tags.iter().any(|tag| &tag.id == tag_id));

                status_match && priority_match && search_match && tag_match
            })
            .collect()
    } else {
        tasks.items
    };

    let total = filtered_tasks.len() as u32;

    Ok(TaskListResponse {
        tasks: filtered_tasks,
        total,
        page: page_params.page,
        page_size: page_params.page_size,
    })
}

/// Get a single task by ID
#[tauri::command]
pub async fn get_task(
    db_state: State<'_, Arc<Mutex<Database>>>,
    id: String,
) -> Result<Task, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = TaskService::new(&db);

    service
        .get_task(&id)
        .map_err(|e| AppError::from(e).to_string())
}

/// Create a new task
#[tauri::command]
pub async fn create_task(
    db_state: State<'_, Arc<Mutex<Database>>>,
    data: CreateTaskDto,
) -> Result<Task, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = TaskService::new(&db);

    service
        .create_task(data)
        .map_err(|e| AppError::from(e).to_string())
}

/// Update an existing task
#[tauri::command]
pub async fn update_task(
    db_state: State<'_, Arc<Mutex<Database>>>,
    id: String,
    data: UpdateTaskDto,
) -> Result<Task, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = TaskService::new(&db);

    service
        .update_task(&id, data)
        .map_err(|e| AppError::from(e).to_string())
}

/// Delete a task
#[tauri::command]
pub async fn delete_task(
    db_state: State<'_, Arc<Mutex<Database>>>,
    id: String,
) -> Result<bool, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = TaskService::new(&db);

    service
        .delete_task(&id)
        .map_err(|e| AppError::from(e).to_string())
}

/// Mark a task as done
#[tauri::command]
pub async fn mark_task_done(
    db_state: State<'_, Arc<Mutex<Database>>>,
    id: String,
) -> Result<Task, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = TaskService::new(&db);

    let dto = UpdateTaskDto {
        title: None,
        description: None,
        status: Some(TaskStatus::Completed),
        priority: None,
        due_date: None,
        image_path: None,
        notes: None,
        estimated_minutes: None,
        actual_minutes: None,
        tag_ids: None,
    };

    service
        .update_task(&id, dto)
        .map_err(|e| AppError::from(e).to_string())
}

/// Search tasks by query
#[tauri::command]
pub async fn search_tasks(
    db_state: State<'_, Arc<Mutex<Database>>>,
    query: String,
) -> Result<Vec<Task>, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = TaskService::new(&db);

    service
        .search_tasks(&query)
        .map_err(|e| AppError::from(e).to_string())
}

/// Export all tasks to JSON
#[tauri::command]
pub async fn export_tasks_json(
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<String, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let repo = TaskRepository::new(&db);

    // Get all tasks using find_all with large page size
    let pagination = crate::models::Pagination {
        page: 1,
        page_size: 10000, // Large enough to get all tasks
    };
    let response = repo
        .find_all(None, None, pagination)
        .map_err(|e| format!("Failed to get tasks: {}", e))?;
    let tasks = response.items;

    // Serialize to pretty JSON
    serde_json::to_string_pretty(&tasks).map_err(|e| format!("Failed to serialize tasks: {}", e))
}

/// Export all tasks to CSV
#[tauri::command]
pub async fn export_tasks_csv(db_state: State<'_, Arc<Mutex<Database>>>) -> Result<String, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let repo = TaskRepository::new(&db);

    let pagination = crate::models::Pagination {
        page: 1,
        page_size: 10000,
    };
    let response = repo
        .find_all(None, None, pagination)
        .map_err(|e| format!("Failed to get tasks: {}", e))?;
    let tasks = response.items;

    // Build CSV header
    let mut csv =
        String::from("id,title,description,status,priority,due_date,tags,created_at,updated_at\n");

    // Add each task as a row
    for task in tasks {
        let description = task.description.unwrap_or_default().replace("\"", "\"\"");
        let due_date = task.due_date.map(|d| d.to_rfc3339()).unwrap_or_default();
        let tag_names: Vec<String> = task.tags.iter().map(|t| t.name.clone()).collect();
        let tags = tag_names.join("|");

        csv.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
            task.id,
            task.title.replace("\"", "\"\""),
            description,
            task.status.as_str(),
            task.priority.as_str(),
            due_date,
            tags,
            task.created_at.to_rfc3339(),
            task.updated_at.to_rfc3339()
        ));
    }

    Ok(csv)
}

/// Import tasks from JSON
#[tauri::command]
pub async fn import_tasks_json(
    db_state: State<'_, Arc<Mutex<Database>>>,
    json_data: String,
) -> Result<usize, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = TaskService::new(&db);

    // Parse JSON to tasks
    let tasks: Vec<CreateTaskDto> =
        serde_json::from_str(&json_data).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Import each task
    let mut count = 0;
    for task_data in tasks {
        match service.create_task(task_data) {
            Ok(_) => count += 1,
            Err(e) => {
                // Log error but continue with other tasks
                eprintln!("Failed to import task: {}", e);
            }
        }
    }

    Ok(count)
}

/// Import tasks from CSV
#[tauri::command]
pub async fn import_tasks_csv(
    db_state: State<'_, Arc<Mutex<Database>>>,
    csv_data: String,
) -> Result<usize, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = TaskService::new(&db);

    let mut count = 0;
    let lines: Vec<&str> = csv_data.lines().collect();

    // Skip header row
    for line in lines.iter().skip(1) {
        if line.trim().is_empty() {
            continue;
        }

        // Parse CSV line (simple implementation)
        let fields: Vec<&str> = line
            .split(',')
            .map(|s| s.trim_matches('"').trim())
            .collect();

        if fields.len() < 9 {
            eprintln!("Skipping invalid CSV line: {}", line);
            continue;
        }

        // Parse due_date
        let due_date = if !fields[5].is_empty() {
            match DateTime::parse_from_rfc3339(fields[5]) {
                Ok(dt) => Some(dt.with_timezone(&Utc)),
                Err(_) => None,
            }
        } else {
            None
        };

        // Parse tags
        let tags: Vec<String> = if !fields[6].is_empty() {
            fields[6].split('|').map(|s| s.to_string()).collect()
        } else {
            vec![]
        };

        // Create task DTO
        let task_data = CreateTaskDto {
            title: fields[1].to_string(),
            description: if !fields[2].is_empty() {
                Some(fields[2].to_string())
            } else {
                None
            },
            priority: TaskPriority::from_str(fields[4]).unwrap_or(TaskPriority::Medium),
            due_date,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: tags,
        };

        match service.create_task(task_data) {
            Ok(_) => count += 1,
            Err(e) => {
                eprintln!("Failed to import task from CSV: {}", e);
            }
        }
    }

    Ok(count)
}

/// Backup all data (tasks + reminders) to JSON
#[tauri::command]
pub async fn backup_data(db_state: State<'_, Arc<Mutex<Database>>>) -> Result<String, String> {
    use serde_json::json;

    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let task_repo = TaskRepository::new(&db);
    let reminder_repo = ReminderRepository::new(&db);

    // Get all data
    let pagination = crate::models::Pagination {
        page: 1,
        page_size: 10000,
    };
    let tasks_response = task_repo
        .find_all(None, None, pagination)
        .map_err(|e| format!("Failed to get tasks: {}", e))?;
    let tasks = tasks_response.items;

    let reminders = reminder_repo
        .find_all()
        .map_err(|e| format!("Failed to get reminders: {}", e))?;

    // Create backup object with timestamp
    let backup = json!({
        "version": "1.0",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "tasks": tasks,
        "reminders": reminders
    });

    serde_json::to_string_pretty(&backup).map_err(|e| format!("Failed to serialize backup: {}", e))
}

/// Restore data from backup JSON
#[tauri::command]
pub async fn restore_data(
    db_state: State<'_, Arc<Mutex<Database>>>,
    backup_data: String,
) -> Result<(usize, usize), String> {
    use crate::services::ReminderService;

    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let task_service = TaskService::new(&db);
    let reminder_service = ReminderService::new(&db);

    // Parse backup JSON
    let backup: serde_json::Value =
        serde_json::from_str(&backup_data).map_err(|e| format!("Failed to parse backup: {}", e))?;

    // Extract tasks and reminders
    let tasks: Vec<CreateTaskDto> = serde_json::from_value(
        backup
            .get("tasks")
            .ok_or("Missing tasks in backup")?
            .clone(),
    )
    .map_err(|e| format!("Failed to parse tasks: {}", e))?;

    let reminders: Vec<CreateReminderDto> = serde_json::from_value(
        backup
            .get("reminders")
            .ok_or("Missing reminders in backup")?
            .clone(),
    )
    .map_err(|e| format!("Failed to parse reminders: {}", e))?;

    // Restore tasks
    let mut task_count = 0;
    for task_data in tasks {
        match task_service.create_task(task_data) {
            Ok(_) => task_count += 1,
            Err(e) => eprintln!("Failed to restore task: {}", e),
        }
    }

    // Restore reminders
    let mut reminder_count = 0;
    for reminder_data in reminders {
        match reminder_service.create_reminder(reminder_data) {
            Ok(_) => reminder_count += 1,
            Err(e) => eprintln!("Failed to restore reminder: {}", e),
        }
    }

    Ok((task_count, reminder_count))
}
