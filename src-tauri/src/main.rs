// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod error;
mod models;
mod notification;
mod repositories;
mod services;

use commands::*;
use db::Database;
use notification::NotificationService;
use std::sync::{Arc, Mutex};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .setup(|app| {
            // Initialize database
            let db = Database::new(app.handle()).expect("Failed to initialize database");

            // Seed sample data in development mode
            #[cfg(debug_assertions)]
            {
                println!("🔧 Development mode detected");
                let conn = db.connection();
                if let Err(e) = db::seed_sample_data(conn) {
                    eprintln!("⚠️  Failed to seed sample data: {}", e);
                }
            }

            // Wrap database in Arc<Mutex<>> for sharing across threads
            let db_arc = Arc::new(Mutex::new(db));

            // Store database in app state
            app.manage(db_arc.clone());

            // Start notification service in background
            let notification_service =
                NotificationService::new(app.handle().clone(), Arc::clone(&db_arc));
            notification_service.start();

            // Store notification service in app state
            app.manage(Mutex::new(notification_service));

            println!("✅ Task Reminder initialized successfully");
            println!("📬 Notification service started");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tasks,
            get_task,
            create_task,
            update_task,
            delete_task,
            mark_task_done,
            search_tasks,
            export_tasks_json,
            export_tasks_csv,
            import_tasks_json,
            import_tasks_csv,
            backup_data,
            restore_data,
            get_reminders,
            get_reminder,
            create_reminder,
            update_reminder,
            delete_reminder,
            get_due_reminders,
            export_reminders_json,
            export_reminders_csv,
            import_reminders_json,
            import_reminders_csv,
            get_settings,
            update_settings,
            list_tags,
            get_tag,
            create_tag,
            update_tag,
            delete_tag,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
