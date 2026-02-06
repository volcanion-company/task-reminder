use serde::{Deserialize, Serialize};

/// Settings key-value pair stored in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub updated_at: String,
}

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub notification_sound: bool,
    pub show_completed_tasks: bool,
    pub default_task_priority: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            language: "en".to_string(),
            notification_sound: true,
            show_completed_tasks: false,
            default_task_priority: "medium".to_string(),
        }
    }
}

impl AppSettings {
    /// Convert settings to key-value pairs for database storage
    pub fn to_key_value_pairs(&self) -> Vec<(String, String)> {
        vec![
            ("theme".to_string(), self.theme.clone()),
            ("language".to_string(), self.language.clone()),
            (
                "notification_sound".to_string(),
                self.notification_sound.to_string(),
            ),
            (
                "show_completed_tasks".to_string(),
                self.show_completed_tasks.to_string(),
            ),
            (
                "default_task_priority".to_string(),
                self.default_task_priority.clone(),
            ),
        ]
    }

    /// Create settings from key-value pairs
    pub fn from_key_value_pairs(pairs: Vec<Setting>) -> Self {
        let mut settings = Self::default();

        for setting in pairs {
            match setting.key.as_str() {
                "theme" => settings.theme = setting.value,
                "language" => settings.language = setting.value,
                "notification_sound" => {
                    settings.notification_sound = setting.value.parse().unwrap_or(true)
                }
                "show_completed_tasks" => {
                    settings.show_completed_tasks = setting.value.parse().unwrap_or(false)
                }
                "default_task_priority" => settings.default_task_priority = setting.value,
                _ => {}
            }
        }

        settings
    }
}
