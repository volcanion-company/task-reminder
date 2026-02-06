use crate::db::Database;
use crate::error::AppError;
use crate::models::{CreateReminderDto, Reminder, UpdateReminderDto};
use crate::repositories::ReminderRepository;
use crate::services::ReminderService;
use chrono::{DateTime, Utc};
use std::sync::{Arc, Mutex};
use tauri::State;

/// Get reminders for a task
#[tauri::command]
pub async fn get_reminders(
    db_state: State<'_, Arc<Mutex<Database>>>,
    task_id: Option<String>,
) -> Result<Vec<Reminder>, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = ReminderService::new(&db);

    service
        .get_reminders(task_id.as_deref())
        .map_err(|e| AppError::from(e).to_string())
}

/// Get a single reminder by ID
#[tauri::command]
pub async fn get_reminder(
    db_state: State<'_, Arc<Mutex<Database>>>,
    id: String,
) -> Result<Reminder, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = ReminderService::new(&db);

    service
        .get_reminder(&id)
        .map_err(|e| AppError::from(e).to_string())
}

/// Create a new reminder
#[tauri::command]
pub async fn create_reminder(
    db_state: State<'_, Arc<Mutex<Database>>>,
    data: CreateReminderDto,
) -> Result<Reminder, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = ReminderService::new(&db);

    service
        .create_reminder(data)
        .map_err(|e| AppError::from(e).to_string())
}

/// Update an existing reminder
#[tauri::command]
pub async fn update_reminder(
    db_state: State<'_, Arc<Mutex<Database>>>,
    id: String,
    data: UpdateReminderDto,
) -> Result<Reminder, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = ReminderService::new(&db);

    service
        .update_reminder(&id, data)
        .map_err(|e| AppError::from(e).to_string())
}

/// Delete a reminder
#[tauri::command]
pub async fn delete_reminder(
    db_state: State<'_, Arc<Mutex<Database>>>,
    id: String,
) -> Result<bool, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = ReminderService::new(&db);

    service
        .delete_reminder(&id)
        .map_err(|e| AppError::from(e).to_string())
}

/// Get due reminders
#[tauri::command]
pub async fn get_due_reminders(
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<Reminder>, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = ReminderService::new(&db);

    service
        .get_due_reminders()
        .map_err(|e| AppError::from(e).to_string())
}

/// Export all reminders to JSON
#[tauri::command]
pub async fn export_reminders_json(
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<String, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let repo = ReminderRepository::new(&db);

    // Get all reminders
    let reminders = repo
        .find_all()
        .map_err(|e| format!("Failed to get reminders: {}", e))?;

    // Serialize to pretty JSON
    serde_json::to_string_pretty(&reminders)
        .map_err(|e| format!("Failed to serialize reminders: {}", e))
}

/// Export all reminders to CSV
#[tauri::command]
pub async fn export_reminders_csv(
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<String, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let repo = ReminderRepository::new(&db);

    let reminders = repo
        .find_all()
        .map_err(|e| format!("Failed to get reminders: {}", e))?;

    // Build CSV header
    let mut csv = String::from("id,task_id,title,remind_at,is_active,created_at,updated_at\n");

    // Add each reminder as a row
    for reminder in reminders {
        let task_id = reminder.task_id.unwrap_or_default();
        csv.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",{},\"{}\",\"{}\"\n",
            reminder.id,
            task_id,
            reminder.title.replace("\"", "\"\""),
            reminder.remind_at.to_rfc3339(),
            reminder.is_active,
            reminder.created_at.to_rfc3339(),
            reminder.updated_at.to_rfc3339()
        ));
    }

    Ok(csv)
}

/// Import reminders from JSON
#[tauri::command]
pub async fn import_reminders_json(
    db_state: State<'_, Arc<Mutex<Database>>>,
    json_data: String,
) -> Result<usize, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = ReminderService::new(&db);

    // Parse JSON to reminders
    let reminders: Vec<CreateReminderDto> =
        serde_json::from_str(&json_data).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Import each reminder
    let mut count = 0;
    for reminder_data in reminders {
        match service.create_reminder(reminder_data) {
            Ok(_) => count += 1,
            Err(e) => {
                // Log error but continue with other reminders
                eprintln!("Failed to import reminder: {}", e);
            }
        }
    }

    Ok(count)
}

/// Import reminders from CSV
#[tauri::command]
pub async fn import_reminders_csv(
    db_state: State<'_, Arc<Mutex<Database>>>,
    csv_data: String,
) -> Result<usize, String> {
    let db = db_state
        .lock()
        .map_err(|_| AppError::DatabaseLock("Failed to acquire database lock".to_string()))?;
    let service = ReminderService::new(&db);

    let mut count = 0;
    let lines: Vec<&str> = csv_data.lines().collect();

    // Skip header row
    for line in lines.iter().skip(1) {
        if line.trim().is_empty() {
            continue;
        }

        // Parse CSV line
        let fields: Vec<&str> = line
            .split(',')
            .map(|s| s.trim_matches('"').trim())
            .collect();

        if fields.len() < 7 {
            eprintln!("Skipping invalid CSV line: {}", line);
            continue;
        }

        // Parse remind_at
        let remind_at = match DateTime::parse_from_rfc3339(fields[3]) {
            Ok(dt) => dt.with_timezone(&Utc),
            Err(e) => {
                eprintln!("Failed to parse remind_at: {}", e);
                continue;
            }
        };

        // Create reminder DTO
        let task_id_value = fields[1];
        let reminder_data = CreateReminderDto {
            task_id: if !task_id_value.is_empty() {
                Some(task_id_value.to_string())
            } else {
                None
            },
            title: fields[2].to_string(),
            description: None,
            remind_at,
            repeat_interval: crate::models::RepeatInterval::none(),
        };

        match service.create_reminder(reminder_data) {
            Ok(_) => count += 1,
            Err(e) => {
                eprintln!("Failed to import reminder from CSV: {}", e);
            }
        }
    }

    Ok(count)
}
