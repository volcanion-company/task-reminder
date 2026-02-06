use crate::models::Tag;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTagDto {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTagDto {
    pub name: Option<String>,
    pub color: Option<String>,
}

/// List all tags
#[tauri::command]
pub async fn list_tags(db: State<'_, Mutex<rusqlite::Connection>>) -> Result<Vec<Tag>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, color, created_at
         FROM tags 
         ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let tags = stmt
        .query_map([], |row| {
            let created_at_str: String = row.get(3)?;
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&created_at_str)
                    .unwrap_or_else(|_| chrono::Utc::now().into())
                    .with_timezone(&chrono::Utc),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tags)
}

/// Get a single tag by ID
#[tauri::command]
pub async fn get_tag(
    db: State<'_, Mutex<rusqlite::Connection>>,
    id: String,
) -> Result<Option<Tag>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, color, created_at
         FROM tags 
         WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let tag = stmt
        .query_row([&id], |row| {
            let created_at_str: String = row.get(3)?;
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&created_at_str)
                    .unwrap_or_else(|_| chrono::Utc::now().into())
                    .with_timezone(&chrono::Utc),
            })
        })
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(tag)
}

/// Create a new tag
#[tauri::command]
pub async fn create_tag(
    db: State<'_, Mutex<rusqlite::Connection>>,
    dto: CreateTagDto,
) -> Result<Tag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO tags (id, name, color, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        (&id, &dto.name, &dto.color, &now, &now),
    )
    .map_err(|e| e.to_string())?;

    let created_at = chrono::DateTime::parse_from_rfc3339(&now)
        .unwrap_or_else(|_| chrono::Utc::now().into())
        .with_timezone(&chrono::Utc);

    Ok(Tag {
        id,
        name: dto.name,
        color: dto.color,
        created_at,
    })
}

/// Update an existing tag
#[tauri::command]
pub async fn update_tag(
    db: State<'_, Mutex<rusqlite::Connection>>,
    id: String,
    dto: UpdateTagDto,
) -> Result<Tag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // Build dynamic UPDATE query
    let mut updates = Vec::new();
    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();

    if let Some(ref name) = dto.name {
        updates.push("name = ?");
        params.push(name);
    }

    if let Some(ref color) = dto.color {
        updates.push("color = ?");
        params.push(color);
    }

    if !updates.is_empty() {
        updates.push("updated_at = ?");
        params.push(&now);
        params.push(&id);

        let query = format!("UPDATE tags SET {} WHERE id = ?", updates.join(", "));
        conn.execute(&query, rusqlite::params_from_iter(params))
            .map_err(|e| e.to_string())?;
    }

    // Fetch and return the updated tag
    let tag = conn
        .query_row(
            "SELECT id, name, color, created_at FROM tags WHERE id = ?1",
            [&id],
            |row| {
                let created_at_str: String = row.get(3)?;
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    created_at: chrono::DateTime::parse_from_rfc3339(&created_at_str)
                        .unwrap_or_else(|_| chrono::Utc::now().into())
                        .with_timezone(&chrono::Utc),
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(tag)
}

/// Delete a tag
#[tauri::command]
pub async fn delete_tag(
    db: State<'_, Mutex<rusqlite::Connection>>,
    id: String,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Delete task_tags associations first (foreign key constraint)
    conn.execute("DELETE FROM task_tags WHERE tag_id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Delete the tag
    let rows_affected = conn
        .execute("DELETE FROM tags WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    if rows_affected == 0 {
        return Err("Tag not found".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_tag_dto() {
        let dto = CreateTagDto {
            name: "Work".to_string(),
            color: "#3b82f6".to_string(),
        };
        assert_eq!(dto.name, "Work");
        assert_eq!(dto.color, "#3b82f6");
    }
}
