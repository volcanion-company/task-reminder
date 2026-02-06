use crate::db::Database;
use crate::models::Reminder;
use crate::repositories::ReminderRepository;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// Notification service for checking and triggering reminders
pub struct NotificationService {
    app_handle: AppHandle,
    db: Arc<Mutex<Database>>,
    is_running: Arc<Mutex<bool>>,
}

impl NotificationService {
    pub fn new(app_handle: AppHandle, db: Arc<Mutex<Database>>) -> Self {
        Self {
            app_handle,
            db,
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    /// Start the background notification checker
    pub fn start(&self) {
        let mut is_running = self.is_running.lock().unwrap();
        if *is_running {
            println!("Notification service already running");
            return;
        }
        *is_running = true;
        drop(is_running);

        let app_handle = self.app_handle.clone();
        let db = self.db.clone();
        let is_running_flag = self.is_running.clone();

        thread::spawn(move || {
            println!("🔔 Notification service started");

            loop {
                // Check if service should stop
                {
                    let running = is_running_flag.lock().unwrap();
                    if !*running {
                        println!("Notification service stopped");
                        break;
                    }
                }

                // Check for due reminders
                if let Ok(db_lock) = db.lock() {
                    let repo = ReminderRepository::new(&db_lock);

                    match repo.find_due_reminders() {
                        Ok(due_reminders) => {
                            for reminder in due_reminders {
                                Self::trigger_notification(&app_handle, &reminder);

                                // Update last_triggered_at
                                if let Err(e) = repo.mark_as_triggered(&reminder.id) {
                                    eprintln!("Failed to mark reminder as triggered: {}", e);
                                }

                                // Schedule next trigger for repeating reminders
                                if reminder.repeat_interval.is_repeating() {
                                    if let Some(next_time) = reminder.next_trigger_time() {
                                        println!(
                                            "📅 Scheduling next trigger for '{}' at: {}",
                                            reminder.title, next_time
                                        );
                                        if let Err(e) =
                                            repo.update_next_trigger_time(&reminder.id, &next_time)
                                        {
                                            eprintln!("Failed to update next trigger time: {}", e);
                                        } else {
                                            println!("✅ Next trigger time updated successfully");
                                        }
                                    } else {
                                        println!(
                                            "⚠️ Could not calculate next trigger time for '{}'",
                                            reminder.title
                                        );
                                    }
                                } else {
                                    println!(
                                        "ℹ️ Reminder '{}' is non-repeating, will not reschedule",
                                        reminder.title
                                    );
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("Failed to fetch due reminders: {}", e);
                        }
                    }
                }

                // Sleep for 30 seconds before next check
                thread::sleep(Duration::from_secs(30));
            }
        });
    }

    /// Stop the notification service
    pub fn stop(&self) {
        let mut is_running = self.is_running.lock().unwrap();
        *is_running = false;
    }

    /// Trigger a notification for a reminder
    fn trigger_notification(app_handle: &AppHandle, reminder: &Reminder) {
        println!(
            "🔔 Triggering notification for reminder: {}",
            reminder.title
        );

        // Send notification to frontend
        if let Err(e) = app_handle.emit("reminder-triggered", reminder) {
            eprintln!("Failed to emit reminder event: {}", e);
        }

        // Show system notification using Tauri
        #[cfg(not(target_os = "linux"))]
        {
            use tauri_plugin_notification::NotificationExt;

            let _ = app_handle
                .notification()
                .builder()
                .title("⏰ Task Reminder")
                .body(&reminder.title)
                .show();
        }
    }
}
