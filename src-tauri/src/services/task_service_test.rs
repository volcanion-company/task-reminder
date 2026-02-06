#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::models::{CreateTaskDto, TaskStatus, TaskPriority, UpdateTaskDto};
    use rusqlite::Connection;

    fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        
        // Create tables
        conn.execute(
            "CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                due_date TEXT,
                notes TEXT,
                estimated_minutes INTEGER,
                actual_minutes INTEGER,
                image_path TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        ).unwrap();

        conn.execute(
            "CREATE TABLE task_tags (
                task_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (task_id, tag_id)
            )",
            [],
        ).unwrap();

        conn.execute(
            "CREATE TABLE tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        ).unwrap();

        Database::new_from_connection(conn)
    }

    #[test]
    fn test_create_task_success() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        let dto = CreateTaskDto {
            title: "Test Task".to_string(),
            description: Some("Test Description".to_string()),
            priority: TaskPriority::High,
            due_date: None,
            notes: None,
            estimated_minutes: Some(60),
            tag_ids: vec![],
        };

        let result = service.create_task(dto);
        assert!(result.is_ok());

        let task = result.unwrap();
        assert_eq!(task.title, "Test Task");
        assert_eq!(task.priority, TaskPriority::High);
        assert_eq!(task.status, TaskStatus::Pending);
    }

    #[test]
    fn test_create_task_validates_title_length() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        // Title too short
        let dto = CreateTaskDto {
            title: "AB".to_string(), // Less than 3 characters
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };

        let result = service.create_task(dto);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::ValidationError(_)));
    }

    #[test]
    fn test_create_task_validates_title_max_length() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        // Title too long
        let long_title = "a".repeat(201); // More than 200 characters
        let dto = CreateTaskDto {
            title: long_title,
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };

        let result = service.create_task(dto);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::ValidationError(_)));
    }

    #[test]
    fn test_create_task_validates_description_length() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        let long_description = "a".repeat(2001); // More than 2000 characters
        let dto = CreateTaskDto {
            title: "Valid Title".to_string(),
            description: Some(long_description),
            priority: TaskPriority::Medium,
            due_date: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };

        let result = service.create_task(dto);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::ValidationError(_)));
    }

    #[test]
    fn test_update_task_success() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        // Create a task first
        let create_dto = CreateTaskDto {
            title: "Original Title".to_string(),
            description: None,
            priority: TaskPriority::Low,
            due_date: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };

        let task = service.create_task(create_dto).unwrap();

        // Update the task
        let update_dto = UpdateTaskDto {
            title: Some("Updated Title".to_string()),
            description: Some("New description".to_string()),
            status: Some(TaskStatus::InProgress),
            priority: Some(TaskPriority::High),
            due_date: None,
            notes: None,
            estimated_minutes: None,
            actual_minutes: None,
            tag_ids: None,
        };

        let result = service.update_task(&task.id, update_dto);
        assert!(result.is_ok());

        let updated_task = result.unwrap();
        assert_eq!(updated_task.title, "Updated Title");
        assert_eq!(updated_task.status, TaskStatus::InProgress);
        assert_eq!(updated_task.priority, TaskPriority::High);
    }

    #[test]
    fn test_delete_task_success() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        // Create a task
        let dto = CreateTaskDto {
            title: "Task to Delete".to_string(),
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };

        let task = service.create_task(dto).unwrap();

        // Delete it
        let result = service.delete_task(&task.id);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);

        // Verify it's deleted
        let get_result = service.get_task(&task.id);
        assert!(get_result.is_err());
    }

    #[test]
    fn test_get_task_not_found() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        let result = service.get_task("non-existent-id");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::TaskNotFound(_)));
    }

    #[test]
    fn test_search_tasks() {
        let db = setup_test_db();
        let service = TaskService::new(&db);

        // Create multiple tasks
        service.create_task(CreateTaskDto {
            title: "Buy groceries".to_string(),
            description: Some("Milk and bread".to_string()),
            priority: TaskPriority::Medium,
            due_date: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        }).unwrap();

        service.create_task(CreateTaskDto {
            title: "Meeting with client".to_string(),
            description: Some("Discuss project requirements".to_string()),
            priority: TaskPriority::High,
            due_date: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        }).unwrap();

        // Search
        let results = service.search_tasks("groceries").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Buy groceries");

        // Search in description
        let results2 = service.search_tasks("project").unwrap();
        assert_eq!(results2.len(), 1);
        assert_eq!(results2[0].title, "Meeting with client");
    }
}
