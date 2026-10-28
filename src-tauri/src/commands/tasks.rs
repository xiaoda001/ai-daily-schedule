use crate::{
    models::{AppState, Task, TaskCounts},
    store::{
        ensure_group_exists, fetch_task, map_task, timestamp_ms, validate_name, validate_status,
        validate_task_filter, with_connection, AppResult,
    },
};
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub(crate) fn list_tasks(
    state: State<'_, AppState>,
    group_id: Option<i64>,
    status: String,
    include_archived: bool,
) -> AppResult<Vec<Task>> {
    validate_task_filter(&status)?;
    with_connection(&state, |connection| {
        let mut statement = connection
            .prepare(
                "SELECT id, title, description, group_id, status, created_at, updated_at
                 FROM tasks
                 WHERE (?1 IS NULL OR group_id = ?1)
                   AND (?3 OR group_id IN (SELECT id FROM task_groups WHERE archived = 0))
                   AND ((?2 = 'active' AND status IN ('todo', 'in_progress')) OR ?2 = 'all' OR status = ?2)
                 ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
                          created_at DESC, id DESC",
            )
            .map_err(|error| format!("读取任务失败：{error}"))?;
        let rows = statement
            .query_map(params![group_id, status, include_archived], map_task)
            .map_err(|error| format!("读取任务失败：{error}"))?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|error| format!("读取任务失败：{error}"))
    })
}

#[tauri::command]
pub(crate) fn get_task_counts(
    state: State<'_, AppState>,
    group_id: Option<i64>,
    include_archived: bool,
) -> AppResult<TaskCounts> {
    with_connection(&state, |connection| {
        connection
            .query_row(
                "SELECT
                     COALESCE(SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END), 0),
                     COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0),
                     COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
                     COUNT(*)
                 FROM tasks
                 WHERE (?1 IS NULL OR group_id = ?1)
                   AND (?2 OR group_id IN (SELECT id FROM task_groups WHERE archived = 0))",
                params![group_id, include_archived],
                |row| {
                    Ok(TaskCounts {
                        todo: row.get(0)?,
                        in_progress: row.get(1)?,
                        completed: row.get(2)?,
                        total: row.get(3)?,
                    })
                },
            )
            .map_err(|error| format!("读取任务数量失败：{error}"))
    })
}

#[tauri::command]
pub(crate) fn create_task(
    state: State<'_, AppState>,
    title: String,
    description: Option<String>,
    group_id: i64,
) -> AppResult<Task> {
    let title = validate_name(&title, "任务标题", 120)?;
    let description = description.unwrap_or_default().trim().to_owned();
    if description.chars().count() > 1000 {
        return Err("任务描述不能超过 1000 个字符。".to_owned());
    }
    with_connection(&state, |connection| {
        ensure_group_exists(connection, group_id)?;
        let timestamp = timestamp_ms();
        connection
            .execute(
                "INSERT INTO tasks(title, description, group_id, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'todo', ?4, ?4)",
                params![title, description, group_id, timestamp],
            )
            .map_err(|error| format!("保存任务失败：{error}"))?;
        fetch_task(connection, connection.last_insert_rowid())
    })
}

#[tauri::command]
pub(crate) fn update_task(
    state: State<'_, AppState>,
    id: i64,
    title: String,
    description: Option<String>,
    group_id: i64,
) -> AppResult<Task> {
    let title = validate_name(&title, "任务标题", 120)?;
    let description = description.unwrap_or_default().trim().to_owned();
    if description.chars().count() > 1000 {
        return Err("任务描述不能超过 1000 个字符。".to_owned());
    }
    with_connection(&state, |connection| {
        ensure_group_exists(connection, group_id)?;
        let changed = connection
            .execute(
                "UPDATE tasks
                 SET title = ?1, description = ?2, group_id = ?3, updated_at = ?4
                 WHERE id = ?5",
                params![title, description, group_id, timestamp_ms(), id],
            )
            .map_err(|error| format!("保存任务修改失败：{error}"))?;
        if changed == 0 {
            return Err("找不到这条任务。".to_owned());
        }
        fetch_task(connection, id)
    })
}

#[tauri::command]
pub(crate) fn set_task_status(
    state: State<'_, AppState>,
    id: i64,
    status: String,
) -> AppResult<Task> {
    validate_status(&status)?;
    with_connection(&state, |connection| {
        let changed = connection
            .execute(
                "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
                params![status, timestamp_ms(), id],
            )
            .map_err(|error| format!("更新任务状态失败：{error}"))?;
        if changed == 0 {
            return Err("找不到这条任务。".to_owned());
        }
        fetch_task(connection, id)
    })
}
