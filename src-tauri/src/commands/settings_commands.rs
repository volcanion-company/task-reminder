use crate::db::Database;
use crate::models::{AppSettings, Setting};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSettingsDto {
    pub theme: Option<String>,
    pub language: Option<String>,
    pub notification_sound: Option<bool>,
    pub show_completed_tasks: Option<bool>,
    pub default_task_priority: Option<String>,
}

/// Get application settings
#[tauri::command]
pub async fn get_settings(
    db_state: State<'_, Arc<Mutex<Database>>>,
) -> Result<AppSettings, String> {
    let db = db_state.lock().map_err(|e| e.to_string())?;

    // Query all settings from database
    let query = "SELECT key, value, updated_at FROM settings";
    let mut stmt = db.connection().prepare(query).map_err(|e| e.to_string())?;

    let settings_iter = stmt
        .query_map([], |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut settings = Vec::new();
    for setting in settings_iter {
        settings.push(setting.map_err(|e| e.to_string())?);
    }

    // Convert to AppSettings
    Ok(AppSettings::from_key_value_pairs(settings))
}

/// Update application settings
#[tauri::command]
pub async fn update_settings(
    db_state: State<'_, Arc<Mutex<Database>>>,
    dto: UpdateSettingsDto,
) -> Result<AppSettings, String> {
    // First get current settings (no lock held during await)
    let current = get_settings(db_state.clone()).await?;

    // Apply updates
    let mut updated = current.clone();
    if let Some(theme) = dto.theme {
        updated.theme = theme;
    }
    if let Some(language) = dto.language {
        updated.language = language;
    }
    if let Some(notification_sound) = dto.notification_sound {
        updated.notification_sound = notification_sound;
    }
    if let Some(show_completed_tasks) = dto.show_completed_tasks {
        updated.show_completed_tasks = show_completed_tasks;
    }
    if let Some(default_task_priority) = dto.default_task_priority {
        updated.default_task_priority = default_task_priority;
    }

    // Now lock database and save
    let db = db_state.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let pairs = updated.to_key_value_pairs();
    for (key, value) in pairs {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))",
            rusqlite::params![key, value],
        ).map_err(|e| e.to_string())?;
    }

    Ok(updated)
}
