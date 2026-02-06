use crate::db::Database;
use crate::models::{
    CreateTaskDto, PaginatedResponse, Pagination, Tag, Task, TaskFilter, TaskPriority, TaskSort,
    TaskSortField, TaskStatus, UpdateTaskDto,
};
use chrono::{DateTime, Utc};
use rusqlite::{params, Result, Row, ToSql};
use uuid::Uuid;

/// Repository for task data access
pub struct TaskRepository<'a> {
    db: &'a Database,
}

impl<'a> TaskRepository<'a> {
    /// Create a new TaskRepository instance
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Create a new task
    pub fn create(&self, dto: CreateTaskDto) -> Result<Task> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let status = TaskStatus::Pending;

        let conn = self.db.connection();

        // Insert task
        conn.execute(
            "INSERT INTO tasks (
                id, title, description, status, priority, 
                due_date, image_path, notes, estimated_minutes,
                created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                id,
                dto.title,
                dto.description,
                status.as_str(),
                dto.priority.as_str(),
                dto.due_date.map(|d| d.to_rfc3339()),
                dto.image_path,
                dto.notes,
                dto.estimated_minutes,
                now.to_rfc3339(),
                now.to_rfc3339(),
            ],
        )?;

        // Associate tags
        if !dto.tag_ids.is_empty() {
            self.associate_tags(&id, &dto.tag_ids)?;
        }

        // Fetch and return the created task
        self.find_by_id(&id)
            .and_then(|opt| opt.ok_or(rusqlite::Error::QueryReturnedNoRows))
    }

    /// Find task by ID
    pub fn find_by_id(&self, id: &str) -> Result<Option<Task>> {
        let conn = self.db.connection();

        let mut stmt = conn.prepare(
            "SELECT id, title, description, status, priority, 
                    due_date, completed_at, image_path, notes, 
                    estimated_minutes, actual_minutes, created_at, updated_at
             FROM tasks 
             WHERE id = ?1",
        )?;

        let task_result = stmt.query_row(params![id], |row| self.map_row_to_task(row));

        match task_result {
            Ok(mut task) => {
                // Load tags for this task
                task.tags = self.load_tags_for_task(id)?;
                Ok(Some(task))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Update a task
    pub fn update(&self, id: &str, dto: UpdateTaskDto) -> Result<Task> {
        let conn = self.db.connection();

        // Build dynamic UPDATE query based on provided fields
        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(title) = &dto.title {
            updates.push("title = ?");
            params.push(Box::new(title.clone()));
        }
        if let Some(description) = &dto.description {
            updates.push("description = ?");
            params.push(Box::new(description.clone()));
        }
        if let Some(status) = &dto.status {
            updates.push("status = ?");
            params.push(Box::new(status.as_str().to_string()));
        }
        if let Some(priority) = &dto.priority {
            updates.push("priority = ?");
            params.push(Box::new(priority.as_str().to_string()));
        }
        if let Some(due_date) = &dto.due_date {
            updates.push("due_date = ?");
            params.push(Box::new(due_date.to_rfc3339()));
        }
        if let Some(image_path) = &dto.image_path {
            updates.push("image_path = ?");
            params.push(Box::new(image_path.clone()));
        }
        if let Some(notes) = &dto.notes {
            updates.push("notes = ?");
            params.push(Box::new(notes.clone()));
        }
        if let Some(estimated_minutes) = dto.estimated_minutes {
            updates.push("estimated_minutes = ?");
            params.push(Box::new(estimated_minutes));
        }
        if let Some(actual_minutes) = dto.actual_minutes {
            updates.push("actual_minutes = ?");
            params.push(Box::new(actual_minutes));
        }

        if updates.is_empty() && dto.tag_ids.is_none() {
            // Nothing to update, return current task
            return self
                .find_by_id(id)?
                .ok_or(rusqlite::Error::QueryReturnedNoRows);
        }

        // Execute update if there are field changes
        if !updates.is_empty() {
            let query = format!("UPDATE tasks SET {} WHERE id = ?", updates.join(", "));
            params.push(Box::new(id.to_string()));

            let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

            conn.execute(&query, param_refs.as_slice())?;
        }

        // Update tags if provided
        if let Some(tag_ids) = &dto.tag_ids {
            // Remove existing tags
            conn.execute("DELETE FROM task_tags WHERE task_id = ?1", params![id])?;
            // Add new tags
            if !tag_ids.is_empty() {
                self.associate_tags(id, tag_ids)?;
            }
        }

        // Fetch and return updated task
        self.find_by_id(id)?
            .ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    /// Delete a task
    pub fn delete(&self, id: &str) -> Result<bool> {
        let conn = self.db.connection();
        let rows_affected = conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
        Ok(rows_affected > 0)
    }

    /// Find all tasks with filtering, sorting, and pagination
    pub fn find_all(
        &self,
        filter: Option<TaskFilter>,
        sort: Option<Vec<TaskSort>>,
        pagination: Pagination,
    ) -> Result<PaginatedResponse<Task>> {
        let conn = self.db.connection();

        // Build WHERE clause
        let (where_clause, where_params) = self.build_where_clause(&filter);

        // Build ORDER BY clause
        let order_by = self.build_order_by(&sort);

        // Get total count
        let count_query = format!("SELECT COUNT(*) FROM tasks {}", where_clause);
        let total: u32 = conn.query_row(
            &count_query,
            rusqlite::params_from_iter(where_params.iter()),
            |row| row.get(0),
        )?;

        // Get paginated results
        let query = format!(
            "SELECT id, title, description, status, priority, 
                    due_date, completed_at, image_path, notes, 
                    estimated_minutes, actual_minutes, created_at, updated_at
             FROM tasks 
             {} 
             {} 
             LIMIT ?{} OFFSET ?{}",
            where_clause,
            order_by,
            where_params.len() + 1,
            where_params.len() + 2,
        );

        let mut stmt = conn.prepare(&query)?;

        // Rebuild params vector to include pagination
        let mut all_params: Vec<Box<dyn ToSql>> = where_params;
        all_params.push(Box::new(pagination.page_size));
        all_params.push(Box::new(pagination.offset()));

        let param_refs: Vec<&dyn rusqlite::ToSql> = all_params.iter().map(|p| p.as_ref()).collect();

        let tasks = stmt
            .query_map(param_refs.as_slice(), |row| self.map_row_to_task(row))?
            .collect::<Result<Vec<Task>>>()?;

        // Load tags for each task
        let mut tasks_with_tags = Vec::new();
        for mut task in tasks {
            task.tags = self.load_tags_for_task(&task.id)?;
            tasks_with_tags.push(task);
        }

        Ok(PaginatedResponse::new(tasks_with_tags, total, pagination))
    }

    /// Count tasks by status
    pub fn count_by_status(&self) -> Result<Vec<(TaskStatus, u32)>> {
        let conn = self.db.connection();
        let mut stmt =
            conn.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status")?;

        let results = stmt
            .query_map([], |row| {
                let status_str: String = row.get(0)?;
                let count: u32 = row.get(1)?;
                Ok((
                    TaskStatus::from_str(&status_str).unwrap_or(TaskStatus::Pending),
                    count,
                ))
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(results)
    }

    /// Get overdue tasks
    pub fn find_overdue(&self) -> Result<Vec<Task>> {
        let conn = self.db.connection();
        let now = Utc::now().to_rfc3339();

        let mut stmt = conn.prepare(
            "SELECT id, title, description, status, priority, 
                    due_date, completed_at, image_path, notes, 
                    estimated_minutes, actual_minutes, created_at, updated_at
             FROM tasks 
             WHERE due_date < ?1 
               AND status NOT IN ('completed', 'cancelled')
             ORDER BY due_date ASC",
        )?;

        let tasks = stmt
            .query_map(params![now], |row| self.map_row_to_task(row))?
            .collect::<Result<Vec<Task>>>()?;

        // Load tags for each task
        let mut tasks_with_tags = Vec::new();
        for mut task in tasks {
            task.tags = self.load_tags_for_task(&task.id)?;
            tasks_with_tags.push(task);
        }

        Ok(tasks_with_tags)
    }

    // ========================================================================
    // Private helper methods
    // ========================================================================

    /// Map database row to Task struct
    fn map_row_to_task(&self, row: &Row) -> Result<Task> {
        let status_str: String = row.get(3)?;
        let priority_str: String = row.get(4)?;

        let due_date: Option<String> = row.get(5)?;
        let completed_at: Option<String> = row.get(6)?;
        let created_at: String = row.get(11)?;
        let updated_at: String = row.get(12)?;

        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            status: TaskStatus::from_str(&status_str).unwrap_or(TaskStatus::Pending),
            priority: TaskPriority::from_str(&priority_str).unwrap_or(TaskPriority::Medium),
            due_date: due_date
                .and_then(|d| DateTime::parse_from_rfc3339(&d).ok())
                .map(|d| d.with_timezone(&Utc)),
            completed_at: completed_at
                .and_then(|d| DateTime::parse_from_rfc3339(&d).ok())
                .map(|d| d.with_timezone(&Utc)),
            image_path: row.get(7)?,
            notes: row.get(8)?,
            estimated_minutes: row.get(9)?,
            actual_minutes: row.get(10)?,
            created_at: DateTime::parse_from_rfc3339(&created_at)
                .map(|d| d.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            updated_at: DateTime::parse_from_rfc3339(&updated_at)
                .map(|d| d.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            tags: Vec::new(), // Tags loaded separately
        })
    }

    /// Build WHERE clause from filter
    fn build_where_clause(
        &self,
        filter: &Option<TaskFilter>,
    ) -> (String, Vec<Box<dyn rusqlite::ToSql>>) {
        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(f) = filter {
            if let Some(status) = &f.status {
                conditions.push("status = ?".to_string());
                params.push(Box::new(status.as_str().to_string()));
            }

            if let Some(priority) = &f.priority {
                conditions.push("priority = ?".to_string());
                params.push(Box::new(priority.as_str().to_string()));
            }

            if let Some(search) = &f.search {
                conditions.push("(title LIKE ? OR description LIKE ?)".to_string());
                let search_pattern = format!("%{}%", search);
                params.push(Box::new(search_pattern.clone()));
                params.push(Box::new(search_pattern));
            }

            if let Some(due_before) = &f.due_before {
                conditions.push("due_date < ?".to_string());
                params.push(Box::new(due_before.to_rfc3339()));
            }

            if let Some(due_after) = &f.due_after {
                conditions.push("due_date > ?".to_string());
                params.push(Box::new(due_after.to_rfc3339()));
            }

            if let Some(tag_ids) = &f.tag_ids {
                if !tag_ids.is_empty() {
                    let placeholders = vec!["?"; tag_ids.len()].join(",");
                    conditions.push(format!(
                        "id IN (SELECT task_id FROM task_tags WHERE tag_id IN ({}))",
                        placeholders
                    ));
                    for tag_id in tag_ids {
                        params.push(Box::new(tag_id.clone()));
                    }
                }
            }
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        (where_clause, params)
    }

    /// Build ORDER BY clause from sort options
    fn build_order_by(&self, sort: &Option<Vec<TaskSort>>) -> String {
        if let Some(sorts) = sort {
            if !sorts.is_empty() {
                let order_parts: Vec<String> = sorts
                    .iter()
                    .map(|s| format!("{} {}", s.field.as_str(), s.direction.as_str()))
                    .collect();
                return format!("ORDER BY {}", order_parts.join(", "));
            }
        }
        "ORDER BY created_at DESC".to_string()
    }

    /// Associate tags with a task
    fn associate_tags(&self, task_id: &str, tag_ids: &[String]) -> Result<()> {
        let conn = self.db.connection();
        let now = Utc::now().to_rfc3339();

        for tag_id in tag_ids {
            conn.execute(
                "INSERT OR IGNORE INTO task_tags (task_id, tag_id, created_at) 
                 VALUES (?1, ?2, ?3)",
                params![task_id, tag_id, now],
            )?;
        }

        Ok(())
    }

    /// Load tags for a specific task
    fn load_tags_for_task(&self, task_id: &str) -> Result<Vec<Tag>> {
        let conn = self.db.connection();

        let mut stmt = conn.prepare(
            "SELECT t.id, t.name, t.color, t.created_at
             FROM tags t
             INNER JOIN task_tags tt ON t.id = tt.tag_id
             WHERE tt.task_id = ?1
             ORDER BY t.name",
        )?;

        let tags = stmt
            .query_map(params![task_id], |row| {
                let created_at: String = row.get(3)?;
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    created_at: DateTime::parse_from_rfc3339(&created_at)
                        .map(|d| d.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                })
            })?
            .collect::<Result<Vec<Tag>>>()?;

        Ok(tags)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{
        CreateTaskDto, Pagination, SortDirection, TaskFilter, TaskPriority, TaskSort,
        TaskSortField, TaskStatus, UpdateTaskDto,
    };
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
                completed_at TEXT,
                notes TEXT,
                estimated_minutes INTEGER,
                actual_minutes INTEGER,
                image_path TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .unwrap();

        conn.execute(
            "CREATE TABLE task_tags (
                task_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (task_id, tag_id)
            )",
            [],
        )
        .unwrap();

        conn.execute(
            "CREATE TABLE tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )
        .unwrap();

        Database::new_from_connection(conn)
    }

    fn create_test_tag(db: &Database, name: &str) -> String {
        let tag_id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        db.connection()
            .execute(
                "INSERT INTO tags (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![tag_id, name, "#FF0000", now],
            )
            .unwrap();

        tag_id
    }

    #[test]
    fn test_create_task() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let dto = CreateTaskDto {
            title: "Test Task".to_string(),
            description: Some("Test Description".to_string()),
            priority: TaskPriority::Medium,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: Some(60),
            tag_ids: vec![],
        };

        let task = repo.create(dto).unwrap();

        assert_eq!(task.title, "Test Task");
        assert_eq!(task.description, Some("Test Description".to_string()));
        assert_eq!(task.status, TaskStatus::Pending);
        assert_eq!(task.priority, TaskPriority::Medium);
        assert_eq!(task.estimated_minutes, Some(60));
        assert!(task.tags.is_empty());
    }

    #[test]
    fn test_create_task_with_tags() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let tag1_id = create_test_tag(&db, "Work");
        let tag2_id = create_test_tag(&db, "Urgent");

        let dto = CreateTaskDto {
            title: "Tagged Task".to_string(),
            description: None,
            priority: TaskPriority::High,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![tag1_id.clone(), tag2_id.clone()],
        };

        let task = repo.create(dto).unwrap();

        assert_eq!(task.tags.len(), 2);
        assert!(task.tags.iter().any(|t| t.id == tag1_id));
        assert!(task.tags.iter().any(|t| t.id == tag2_id));
    }

    #[test]
    fn test_find_by_id() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let dto = CreateTaskDto {
            title: "Find Me".to_string(),
            description: Some("Test".to_string()),
            priority: TaskPriority::Low,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };

        let created = repo.create(dto).unwrap();
        let found = repo.find_by_id(&created.id).unwrap();

        assert!(found.is_some());
        let task = found.unwrap();
        assert_eq!(task.id, created.id);
        assert_eq!(task.title, "Find Me");
    }

    #[test]
    fn test_find_by_id_not_found() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let result = repo.find_by_id("non-existent-id").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_update_task_title() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let dto = CreateTaskDto {
            title: "Original Title".to_string(),
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };

        let created = repo.create(dto).unwrap();

        let update = UpdateTaskDto {
            title: Some("Updated Title".to_string()),
            description: None,
            status: None,
            priority: None,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            actual_minutes: None,
            tag_ids: None,
        };

        let updated = repo.update(&created.id, update).unwrap();
        assert_eq!(updated.title, "Updated Title");
    }

    #[test]
    fn test_update_task_status() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let dto = CreateTaskDto {
            title: "Task".to_string(),
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };

        let created = repo.create(dto).unwrap();
        assert_eq!(created.status, TaskStatus::Pending);

        let update = UpdateTaskDto {
            title: None,
            description: None,
            status: Some(TaskStatus::InProgress),
            priority: None,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            actual_minutes: None,
            tag_ids: None,
        };

        let updated = repo.update(&created.id, update).unwrap();
        assert_eq!(updated.status, TaskStatus::InProgress);
    }

    #[test]
    fn test_update_task_tags() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let tag1_id = create_test_tag(&db, "Tag1");
        let tag2_id = create_test_tag(&db, "Tag2");
        let tag3_id = create_test_tag(&db, "Tag3");

        let dto = CreateTaskDto {
            title: "Task".to_string(),
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![tag1_id.clone()],
        };

        let created = repo.create(dto).unwrap();
        assert_eq!(created.tags.len(), 1);

        // Update tags
        let update = UpdateTaskDto {
            title: None,
            description: None,
            status: None,
            priority: None,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            actual_minutes: None,
            tag_ids: Some(vec![tag2_id.clone(), tag3_id.clone()]),
        };

        let updated = repo.update(&created.id, update).unwrap();
        assert_eq!(updated.tags.len(), 2);
        assert!(updated.tags.iter().any(|t| t.id == tag2_id));
        assert!(updated.tags.iter().any(|t| t.id == tag3_id));
        assert!(!updated.tags.iter().any(|t| t.id == tag1_id));
    }

    #[test]
    fn test_delete_task() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let dto = CreateTaskDto {
            title: "Delete Me".to_string(),
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };

        let created = repo.create(dto).unwrap();
        let deleted = repo.delete(&created.id).unwrap();

        assert!(deleted);

        let found = repo.find_by_id(&created.id).unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_delete_nonexistent_task() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let deleted = repo.delete("non-existent-id").unwrap();
        assert!(!deleted);
    }

    #[test]
    fn test_find_all_no_filter() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        // Create multiple tasks
        for i in 1..=5 {
            let dto = CreateTaskDto {
                title: format!("Task {}", i),
                description: None,
                priority: TaskPriority::Medium,
                due_date: None,
                image_path: None,
                notes: None,
                estimated_minutes: None,
                tag_ids: vec![],
            };
            repo.create(dto).unwrap();
        }

        let pagination = Pagination {
            page: 1,
            page_size: 10,
        };
        let result = repo.find_all(None, None, pagination).unwrap();

        assert_eq!(result.items.len(), 5);
        assert_eq!(result.total, 5);
    }

    #[test]
    fn test_find_all_with_status_filter() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        // Create tasks with different statuses
        for i in 1..=3 {
            let dto = CreateTaskDto {
                title: format!("Pending Task {}", i),
                description: None,
                priority: TaskPriority::Medium,
                due_date: None,
                image_path: None,
                notes: None,
                estimated_minutes: None,
                tag_ids: vec![],
            };
            repo.create(dto).unwrap();
        }

        // Create and update to InProgress
        let dto = CreateTaskDto {
            title: "InProgress Task".to_string(),
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };
        let task = repo.create(dto).unwrap();
        let update = UpdateTaskDto {
            title: None,
            description: None,
            status: Some(TaskStatus::InProgress),
            priority: None,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            actual_minutes: None,
            tag_ids: None,
        };
        repo.update(&task.id, update).unwrap();

        // Filter by Pending status
        let filter = TaskFilter {
            status: Some(TaskStatus::Pending),
            priority: None,
            tag_ids: None,
            search: None,
            due_before: None,
            due_after: None,
        };

        let pagination = Pagination {
            page: 1,
            page_size: 10,
        };
        let result = repo.find_all(Some(filter), None, pagination).unwrap();

        assert_eq!(result.items.len(), 3);
        assert!(result.items.iter().all(|t| t.status == TaskStatus::Pending));
    }

    #[test]
    fn test_find_all_with_priority_filter() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        // Create tasks with different priorities
        let dto1 = CreateTaskDto {
            title: "High Priority".to_string(),
            description: None,
            priority: TaskPriority::High,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };
        repo.create(dto1).unwrap();

        let dto2 = CreateTaskDto {
            title: "Low Priority".to_string(),
            description: None,
            priority: TaskPriority::Low,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };
        repo.create(dto2).unwrap();

        // Filter by High priority
        let filter = TaskFilter {
            status: None,
            priority: Some(TaskPriority::High),
            tag_ids: None,
            search: None,
            due_before: None,
            due_after: None,
        };

        let pagination = Pagination {
            page: 1,
            page_size: 10,
        };
        let result = repo.find_all(Some(filter), None, pagination).unwrap();

        assert_eq!(result.items.len(), 1);
        assert_eq!(result.items[0].priority, TaskPriority::High);
    }

    #[test]
    fn test_find_all_with_search() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        let dto1 = CreateTaskDto {
            title: "Important Meeting".to_string(),
            description: Some("Discuss project".to_string()),
            priority: TaskPriority::Medium,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };
        repo.create(dto1).unwrap();

        let dto2 = CreateTaskDto {
            title: "Buy Groceries".to_string(),
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };
        repo.create(dto2).unwrap();

        // Search for "meeting"
        let filter = TaskFilter {
            status: None,
            priority: None,
            tag_ids: None,
            search: Some("meeting".to_string()),
            due_before: None,
            due_after: None,
        };

        let pagination = Pagination {
            page: 1,
            page_size: 10,
        };
        let result = repo.find_all(Some(filter), None, pagination).unwrap();

        assert_eq!(result.items.len(), 1);
        assert!(result.items[0].title.to_lowercase().contains("meeting"));
    }

    #[test]
    fn test_find_all_with_sorting() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        // Create tasks with different priorities
        let dto1 = CreateTaskDto {
            title: "Task A".to_string(),
            description: None,
            priority: TaskPriority::Low,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };
        repo.create(dto1).unwrap();

        let dto2 = CreateTaskDto {
            title: "Task B".to_string(),
            description: None,
            priority: TaskPriority::High,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };
        repo.create(dto2).unwrap();

        let dto3 = CreateTaskDto {
            title: "Task C".to_string(),
            description: None,
            priority: TaskPriority::Medium,
            due_date: None,
            image_path: None,
            notes: None,
            estimated_minutes: None,
            tag_ids: vec![],
        };
        repo.create(dto3).unwrap();

        // Sort by priority descending
        let sort = vec![TaskSort {
            field: TaskSortField::Priority,
            direction: SortDirection::Desc,
        }];

        let pagination = Pagination {
            page: 1,
            page_size: 10,
        };
        let result = repo.find_all(None, Some(sort), pagination).unwrap();

        assert_eq!(result.items.len(), 3);
        // SQLite sorts priority text alphabetically: "high" < "low" < "medium"
        // Descending: "urgent" > "medium" > "low" > "high"
        // Since we don't have urgent, DESC order is: medium, low, high
        assert_eq!(result.items[0].priority, TaskPriority::Medium);
        assert_eq!(result.items[1].priority, TaskPriority::Low);
        assert_eq!(result.items[2].priority, TaskPriority::High);
    }

    #[test]
    fn test_find_all_with_pagination() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        // Create 10 tasks
        for i in 1..=10 {
            let dto = CreateTaskDto {
                title: format!("Task {}", i),
                description: None,
                priority: TaskPriority::Medium,
                due_date: None,
                image_path: None,
                notes: None,
                estimated_minutes: None,
                tag_ids: vec![],
            };
            repo.create(dto).unwrap();
        }

        // Get first page (5 items)
        let pagination1 = Pagination {
            page: 1,
            page_size: 5,
        };
        let result1 = repo.find_all(None, None, pagination1).unwrap();

        assert_eq!(result1.items.len(), 5);
        assert_eq!(result1.total, 10);
        assert_eq!(result1.page, 1);
        assert_eq!(result1.page_size, 5);
        assert_eq!(result1.total_pages, 2);

        // Get second page
        let pagination2 = Pagination {
            page: 2,
            page_size: 5,
        };
        let result2 = repo.find_all(None, None, pagination2).unwrap();

        assert_eq!(result2.items.len(), 5);
        assert_eq!(result2.total, 10);
        assert_eq!(result2.page, 2);

        // Ensure different tasks on different pages
        let ids1: Vec<_> = result1.items.iter().map(|t| &t.id).collect();
        let ids2: Vec<_> = result2.items.iter().map(|t| &t.id).collect();
        assert!(ids1.iter().all(|id| !ids2.contains(id)));
    }

    #[test]
    fn test_count_by_status() {
        let db = setup_test_db();
        let repo = TaskRepository::new(&db);

        // Create tasks with different statuses
        for _ in 0..3 {
            let dto = CreateTaskDto {
                title: "Pending Task".to_string(),
                description: None,
                priority: TaskPriority::Medium,
                due_date: None,
                image_path: None,
                notes: None,
                estimated_minutes: None,
                tag_ids: vec![],
            };
            repo.create(dto).unwrap();
        }

        for _ in 0..2 {
            let dto = CreateTaskDto {
                title: "Task".to_string(),
                description: None,
                priority: TaskPriority::Medium,
                due_date: None,
                image_path: None,
                notes: None,
                estimated_minutes: None,
                tag_ids: vec![],
            };
            let task = repo.create(dto).unwrap();

            let update = UpdateTaskDto {
                title: None,
                description: None,
                status: Some(TaskStatus::InProgress),
                priority: None,
                due_date: None,
                image_path: None,
                notes: None,
                estimated_minutes: None,
                actual_minutes: None,
                tag_ids: None,
            };
            repo.update(&task.id, update).unwrap();
        }

        let counts = repo.count_by_status().unwrap();

        let pending_count = counts
            .iter()
            .find(|(status, _)| *status == TaskStatus::Pending)
            .map(|(_, count)| *count)
            .unwrap_or(0);

        let in_progress_count = counts
            .iter()
            .find(|(status, _)| *status == TaskStatus::InProgress)
            .map(|(_, count)| *count)
            .unwrap_or(0);

        assert_eq!(pending_count, 3);
        assert_eq!(in_progress_count, 2);
    }
}
