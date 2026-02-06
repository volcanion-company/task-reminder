use crate::db::Database;
use crate::repositories::ReminderRepository;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

/// Background notification service that checks for due reminders
/// and triggers OS native notifications
pub struct NotificationService {
    app_handle: AppHandle,
    is_running: Arc<Mutex<bool>>,
}

impl NotificationService {
    /// Create a new NotificationService instance
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    /// Start the background notification checker
    /// Runs in a separate thread and checks every 60 seconds
    pub fn start(&self) {
        let mut is_running = self.is_running.lock().unwrap();
        if *is_running {
            println!("⚠️ NotificationService already running");
            return;
        }
        *is_running = true;
        drop(is_running); // Release lock before spawning thread

        let app_handle = self.app_handle.clone();
        let is_running_clone = Arc::clone(&self.is_running);

        thread::spawn(move || {
            println!("✅ NotificationService started - checking every 60 seconds");

            loop {
                // Check if we should keep running
                {
                    let running = is_running_clone.lock().unwrap();
                    if !*running {
                        println!("🛑 NotificationService stopped");
                        break;
                    }
                }

                // Check for due reminders and send notifications
                if let Err(e) = Self::check_and_notify(&app_handle) {
                    eprintln!("❌ Error checking reminders: {}", e);
                }

                // Sleep for 60 seconds before next check
                thread::sleep(Duration::from_secs(60));
            }
        });
    }

    /// Stop the background notification checker
    pub fn stop(&self) {
        let mut is_running = self.is_running.lock().unwrap();
        *is_running = false;
        println!("🛑 NotificationService stop requested");
    }

    /// Check for due reminders and send notifications
    /// This is the core logic that runs periodically
    fn check_and_notify(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        // Get database from app state
        let db = app_handle.state::<Mutex<Database>>();
        let db = db.lock().unwrap();

        // Get due reminders
        let repo = ReminderRepository::new(&db);
        let due_reminders = repo.find_due_reminders()?;

        if due_reminders.is_empty() {
            return Ok(());
        }

        println!("📬 Found {} due reminders", due_reminders.len());

        // Process each due reminder
        for reminder in due_reminders {
            // Send OS notification
            if let Err(e) = Self::send_notification(app_handle, &reminder) {
                eprintln!(
                    "❌ Failed to send notification for '{}': {}",
                    reminder.title, e
                );
                continue;
            }

            // Mark as triggered
            if let Err(e) = repo.mark_as_triggered(&reminder.id) {
                eprintln!("❌ Failed to mark reminder as triggered: {}", e);
            }

            // Emit event to frontend
            if let Err(e) = app_handle.emit("reminder-triggered", reminder.clone()) {
                eprintln!("❌ Failed to emit reminder event: {}", e);
            }

            println!("✅ Reminder triggered: {}", reminder.title);
        }

        Ok(())
    }

    /// Send an OS native notification
    fn send_notification(
        app_handle: &AppHandle,
        reminder: &crate::models::Reminder,
    ) -> Result<(), Box<dyn std::error::Error>> {
        use tauri_plugin_notification::NotificationExt;

        // Build notification
        let notification = app_handle.notification().builder().title(&reminder.title);

        // Set body (description)
        let notification = if let Some(description) = &reminder.description {
            notification.body(description)
        } else {
            notification
        };

        // Send notification
        notification.show()?;

        Ok(())
    }

    /// Manually trigger a check (useful for testing or immediate checks)
    pub fn check_now(&self) -> Result<(), Box<dyn std::error::Error>> {
        Self::check_and_notify(&self.app_handle)
    }
}

impl Drop for NotificationService {
    fn drop(&mut self) {
        self.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Tests would require a test Tauri app setup
    // Placeholder for future testing
}
