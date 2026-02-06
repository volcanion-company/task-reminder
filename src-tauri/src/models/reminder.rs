use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Repeat interval - now supports custom intervals
/// Format: "{type}_{value}_{unit}" e.g. "every_10_minutes", "after_1_hour"
/// Special case: "none" for no repeat
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RepeatInterval(pub String);

impl RepeatInterval {
    pub fn none() -> Self {
        RepeatInterval("none".to_string())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn from_str(s: &str) -> Self {
        RepeatInterval(s.to_string())
    }

    /// Check if this interval represents a repeating reminder
    pub fn is_repeating(&self) -> bool {
        self.0 != "none"
    }

    /// Parse the interval string to extract type, value, and unit
    /// Returns None for "none", Some((type, value, unit)) otherwise
    pub fn parse(&self) -> Option<(String, i64, String)> {
        if self.0 == "none" {
            return None;
        }

        let parts: Vec<&str> = self.0.split('_').collect();
        if parts.len() >= 3 {
            let interval_type = parts[0].to_string();
            if let Ok(value) = parts[1].parse::<i64>() {
                let unit = parts[2..].join("_");
                return Some((interval_type, value, unit));
            }
        }

        None
    }
}

/// Reminder entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub id: String,
    pub task_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub remind_at: DateTime<Utc>,
    pub repeat_interval: RepeatInterval,
    pub is_active: bool,
    pub last_triggered_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Reminder {
    /// Check if reminder is due based on current time
    pub fn is_due(&self) -> bool {
        if !self.is_active {
            return false;
        }

        let now = Utc::now();

        // Check if remind_at time has passed
        if self.remind_at > now {
            return false;
        }

        // For non-repeating reminders, check if it hasn't been triggered yet
        if !self.repeat_interval.is_repeating() {
            return self.last_triggered_at.is_none();
        }

        // For repeating reminders, check if enough time has passed since last trigger
        if let Some(last_triggered) = self.last_triggered_at {
            self.should_repeat_now(last_triggered, now)
        } else {
            // Never triggered, so it's due
            true
        }
    }

    /// Calculate if a repeating reminder should trigger again
    fn should_repeat_now(&self, last_triggered: DateTime<Utc>, now: DateTime<Utc>) -> bool {
        use chrono::Duration;

        // Parse the interval string
        if let Some((interval_type, value, unit)) = self.repeat_interval.parse() {
            // For "after" type, it should only trigger once
            if interval_type == "after" {
                return false;
            }

            // For "every" type, calculate duration based on unit
            let duration = match unit.as_str() {
                "seconds" | "second" => Duration::seconds(value),
                "minutes" | "minute" => Duration::minutes(value),
                "hours" | "hour" => Duration::hours(value),
                "days" | "day" => Duration::days(value),
                "weeks" | "week" => Duration::weeks(value),
                "months" | "month" => Duration::days(value * 30), // Approximate
                "years" | "year" => Duration::days(value * 365),  // Approximate
                _ => return false,                                // Unknown unit
            };

            (now - last_triggered) >= duration
        } else {
            false
        }
    }

    /// Check if reminder is overdue (past remind_at time)
    pub fn is_overdue(&self) -> bool {
        self.is_active && Utc::now() > self.remind_at && self.last_triggered_at.is_none()
    }

    /// Validate reminder business rules
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        // Title must not be empty
        if self.title.trim().is_empty() {
            errors.push("Title cannot be empty".to_string());
        }
        if self.title.len() > 200 {
            errors.push("Title cannot exceed 200 characters".to_string());
        }

        // Description length limit
        if let Some(desc) = &self.description {
            if desc.len() > 1000 {
                errors.push("Description cannot exceed 1000 characters".to_string());
            }
        }

        // remind_at must be set
        if self.remind_at < self.created_at {
            errors.push("Reminder time cannot be before creation time".to_string());
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /// Get next trigger time for repeating reminders
    pub fn next_trigger_time(&self) -> Option<DateTime<Utc>> {
        if !self.is_active || !self.repeat_interval.is_repeating() {
            return None;
        }

        use chrono::Duration;

        let base_time = self.last_triggered_at.unwrap_or(self.remind_at);

        // Parse the interval to get type, value, and unit
        if let Some((interval_type, value, unit)) = self.repeat_interval.parse() {
            // For "after" type, don't calculate next trigger (one-time only)
            if interval_type == "after" {
                return None;
            }

            // For "every" type, calculate next time based on unit
            let duration = match unit.as_str() {
                "seconds" | "second" => Duration::seconds(value),
                "minutes" | "minute" => Duration::minutes(value),
                "hours" | "hour" => Duration::hours(value),
                "days" | "day" => Duration::days(value),
                "weeks" | "week" => Duration::weeks(value),
                "months" | "month" => Duration::days(value * 30),
                "years" | "year" => Duration::days(value * 365),
                _ => return None,
            };

            Some(base_time + duration)
        } else {
            None
        }
    }
}

/// Create reminder DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReminderDto {
    pub task_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub remind_at: DateTime<Utc>,
    pub repeat_interval: RepeatInterval,
}

/// Update reminder DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateReminderDto {
    pub title: Option<String>,
    pub description: Option<String>,
    pub remind_at: Option<DateTime<Utc>>,
    pub repeat_interval: Option<RepeatInterval>,
    pub is_active: Option<bool>,
}
