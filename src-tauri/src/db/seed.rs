use chrono::{Duration, Local};
use rusqlite::Connection;
use uuid::Uuid;

/// Seeds the database with sample data for development and testing purposes.
///
/// Creates a variety of tasks with different:
/// - Statuses (pending, in-progress, completed)
/// - Priorities (low, medium, high, urgent)
/// - Due dates (overdue, today, upcoming, no deadline)
/// - Complexity (simple tasks, tasks with notes, tasks with reminders)
///
/// This helps developers quickly test UI features, filtering, sorting, and notifications.
pub fn seed_sample_data(conn: &Connection) -> Result<(), rusqlite::Error> {
    let now = Local::now();

    // Sample tasks covering different scenarios
    let tasks = vec![
        // Overdue urgent task
        (
            "Fix critical production bug",
            "Database connection pool is exhausting under high load. Users experiencing timeouts.",
            "urgent",
            "pending",
            (now - Duration::days(2)).to_rfc3339(),
            Some("Investigated logs - connection pool size needs to be increased from 10 to 50. Also need to add connection timeout handling."),
            Some(120),
            Some(vec!["bug", "production", "urgent"]),
        ),

        // Today's high priority task
        (
            "Code review for authentication PR",
            "Review the new OAuth2 implementation before it gets merged to main.",
            "high",
            "in_progress",
            now.to_rfc3339(),
            Some("Already reviewed the core logic. Still need to check error handling and add integration tests."),
            Some(60),
            Some(vec!["code-review", "security"]),
        ),

        // Upcoming medium priority task
        (
            "Update API documentation",
            "Document the new endpoints added in v2.0 release.",
            "medium",
            "pending",
            (now + Duration::days(3)).to_rfc3339(),
            None,
            Some(90),
            Some(vec!["documentation", "api"]),
        ),

        // Low priority task without deadline
        (
            "Refactor legacy payment module",
            "The payment processing code needs modernization - it's still using old patterns from 2019.",
            "low",
            "pending",
            (now + Duration::days(14)).to_rfc3339(),
            Some("Consider using the new payment gateway SDK. Will need to coordinate with finance team."),
            Some(480),
            Some(vec!["refactoring", "tech-debt"]),
        ),

        // Completed task
        (
            "Set up CI/CD pipeline",
            "Configure GitHub Actions for automated testing and deployment.",
            "high",
            "completed",
            (now - Duration::days(5)).to_rfc3339(),
            Some("Pipeline now runs on every PR. Includes linting, unit tests, and integration tests. Deploy to staging on main branch."),
            Some(180),
            Some(vec!["devops", "automation"]),
        ),

        // Simple task for today
        (
            "Team standup meeting",
            "Daily sync with the development team.",
            "medium",
            "pending",
            now.to_rfc3339(),
            None,
            Some(15),
            Some(vec!["meeting"]),
        ),

        // Long-term planning task
        (
            "Research new frontend framework",
            "Evaluate React 19, Vue 4, and Svelte 5 for our next major rewrite.",
            "low",
            "pending",
            (now + Duration::days(30)).to_rfc3339(),
            Some("Initial research suggests React 19 has best TypeScript support. Need to build proof-of-concept apps."),
            Some(600),
            Some(vec!["research", "frontend"]),
        ),

        // Task with no due date
        (
            "Write blog post about Clean Architecture",
            "Share our experience implementing Clean Architecture in the task reminder app.",
            "low",
            "pending",
            (now + Duration::days(60)).to_rfc3339(),
            None,
            None,
            Some(vec!["writing", "blog"]),
        ),
    ];

    println!("🌱 Seeding database with sample data...");

    let task_count = tasks.len();

    for (title, description, priority, status, due_date, notes, estimated_minutes, tags) in tasks {
        let task_id = Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO tasks (id, title, description, priority, status, due_date, notes, estimated_minutes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                task_id,
                title,
                description,
                priority,
                status,
                due_date,
                notes,
                estimated_minutes,
                now.to_rfc3339(),
                now.to_rfc3339(),
            ],
        )?;

        // Add reminder for urgent/high priority pending tasks
        if (priority == "urgent" || priority == "high") && status == "pending" {
            let reminder_id = Uuid::new_v4().to_string();
            let remind_at = chrono::DateTime::parse_from_rfc3339(&due_date)
                .unwrap()
                .with_timezone(&Local)
                - Duration::hours(1); // Remind 1 hour before

            conn.execute(
                "INSERT INTO reminders (id, task_id, title, description, remind_at, repeat_interval, is_active, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![
                    reminder_id,
                    task_id,
                    format!("Reminder: {}", title),
                    format!("{} is due in 1 hour!", title),
                    remind_at.to_rfc3339(),
                    "none",
                    1,
                    now.to_rfc3339(),
                    now.to_rfc3339(),
                ],
            )?;
        }

        println!("  ✓ Created task: {}", title);
    }

    println!("✅ Database seeded successfully with {} tasks", task_count);
    Ok(())
}

#[cfg(test)]
mod tests {
    // Tests temporarily disabled - need to refactor database initialization
    // TODO: Add proper test setup
}
