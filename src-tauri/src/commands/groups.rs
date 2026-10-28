use crate::{
    models::{AppState, DeleteGroupOutcome, TaskGroup},
    store::{timestamp_ms, validate_name, with_connection, AppResult},
};
use rusqlite::{params, Transaction};
use tauri::State;

#[tauri::command]
pub(crate) fn list_groups(state: State<'_, AppState>, archived: bool) -> AppResult<Vec<TaskGroup>> {
    with_connection(&state, |connection| {
        let mut statement = connection
            .prepare(
                "SELECT g.id, g.name, COUNT(t.id) AS task_count, g.archived
                 FROM task_groups g
                 LEFT JOIN tasks t ON t.group_id = g.id
                 WHERE g.archived = ?1
                 GROUP BY g.id, g.name, g.sort_order, g.archived
                 ORDER BY g.sort_order ASC, g.id ASC",
            )
            .map_err(|error| format!("读取分组失败：{error}"))?;
        let rows = statement
            .query_map([archived], |row| {
                Ok(TaskGroup {
                    id: row.get("id")?,
                    name: row.get("name")?,
                    task_count: row.get("task_count")?,
                    archived: row.get("archived")?,
                })
            })
            .map_err(|error| format!("读取分组失败：{error}"))?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|error| format!("读取分组失败：{error}"))
    })
}

#[tauri::command]
pub(crate) fn create_group(state: State<'_, AppState>, name: String) -> AppResult<TaskGroup> {
    let name = validate_name(&name, "分组名称", 40)?;
    with_connection(&state, |connection| {
        let timestamp = timestamp_ms();
        connection
            .execute(
                "INSERT INTO task_groups(name, sort_order, archived, created_at, updated_at)
                 VALUES (?1, COALESCE((SELECT MAX(sort_order) + 1 FROM task_groups WHERE archived = 0), 0), 0, ?2, ?2)",
                params![name, timestamp],
            )
            .map_err(|error| {
                if error.to_string().contains("UNIQUE constraint failed") {
                    "已有同名分组。".to_owned()
                } else {
                    format!("创建分组失败：{error}")
                }
            })?;
        Ok(TaskGroup {
            id: connection.last_insert_rowid(),
            name,
            task_count: 0,
            archived: false,
        })
    })
}

#[tauri::command]
pub(crate) fn archive_group(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    with_connection(&state, |connection| {
        let changed = connection
            .execute(
                "UPDATE task_groups SET archived = 1, updated_at = ?1 WHERE id = ?2 AND archived = 0",
                params![timestamp_ms(), id],
            )
            .map_err(|error| format!("归档分组失败：{error}"))?;
        if changed == 0 {
            return Err("找不到这个分组，或它已经归档。".to_owned());
        }
        Ok(())
    })
}

#[tauri::command]
pub(crate) fn restore_group(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    with_connection(&state, |connection| {
        let changed = connection
            .execute(
                "UPDATE task_groups
                 SET archived = 0,
                     sort_order = COALESCE((SELECT MAX(sort_order) + 1 FROM task_groups WHERE archived = 0), 0),
                     updated_at = ?1
                 WHERE id = ?2 AND archived = 1",
                params![timestamp_ms(), id],
            )
            .map_err(|error| format!("恢复分组失败：{error}"))?;
        if changed == 0 {
            return Err("找不到这个归档分组。".to_owned());
        }
        Ok(())
    })
}

#[tauri::command]
pub(crate) fn rename_group(
    state: State<'_, AppState>,
    id: i64,
    name: String,
) -> AppResult<TaskGroup> {
    let name = validate_name(&name, "分组名称", 40)?;
    with_connection(&state, |connection| {
        let changed = connection
            .execute(
                "UPDATE task_groups SET name = ?1, updated_at = ?2 WHERE id = ?3",
                params![name, timestamp_ms(), id],
            )
            .map_err(|error| {
                if error.to_string().contains("UNIQUE constraint failed") {
                    "已有同名分组。".to_owned()
                } else {
                    format!("修改分组失败：{error}")
                }
            })?;
        if changed == 0 {
            return Err("找不到这个分组。".to_owned());
        }
        let task_count = connection
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE group_id = ?1",
                [id],
                |row| row.get(0),
            )
            .map_err(|error| format!("读取分组任务数量失败：{error}"))?;
        Ok(TaskGroup {
            id,
            name,
            task_count,
            archived: false,
        })
    })
}

#[tauri::command]
pub(crate) fn delete_group(state: State<'_, AppState>, id: i64) -> AppResult<DeleteGroupOutcome> {
    with_connection(&state, |connection| {
        let transaction = connection
            .unchecked_transaction()
            .map_err(|error| format!("无法开始删除分组：{error}"))?;
        let outcome = delete_group_in_transaction(&transaction, id)
            .map_err(|error| format!("删除分组失败：{error}"))?;
        transaction
            .commit()
            .map_err(|error| format!("完成分组删除失败：{error}"))?;
        Ok(outcome)
    })
}

fn delete_group_in_transaction(
    transaction: &Transaction<'_>,
    id: i64,
) -> rusqlite::Result<DeleteGroupOutcome> {
    let exists: bool = transaction.query_row(
        "SELECT EXISTS(SELECT 1 FROM task_groups WHERE id = ?1)",
        [id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }
    let deleted_tasks = transaction.query_row(
        "SELECT COUNT(*) FROM tasks WHERE group_id = ?1",
        [id],
        |row| row.get(0),
    )?;
    transaction.execute("DELETE FROM task_groups WHERE id = ?1", [id])?;
    Ok(DeleteGroupOutcome { deleted_tasks })
}

#[tauri::command]
pub(crate) fn reorder_groups(state: State<'_, AppState>, group_ids: Vec<i64>) -> AppResult<()> {
    with_connection(&state, |connection| {
        let transaction = connection
            .unchecked_transaction()
            .map_err(|error| format!("无法开始调整分组顺序：{error}"))?;
        let existing_ids = {
            let mut statement = transaction
                .prepare("SELECT id FROM task_groups WHERE archived = 0")
                .map_err(|error| format!("读取分组顺序失败：{error}"))?;
            let rows = statement
                .query_map([], |row| row.get::<_, i64>(0))
                .map_err(|error| format!("读取分组顺序失败：{error}"))?;
            rows.collect::<rusqlite::Result<std::collections::HashSet<_>>>()
                .map_err(|error| format!("读取分组顺序失败：{error}"))?
        };
        let requested_ids: std::collections::HashSet<_> = group_ids.iter().copied().collect();
        if group_ids.len() != existing_ids.len() || requested_ids != existing_ids {
            return Err("分组列表已更新，请刷新后重试。".to_owned());
        }
        for (position, id) in group_ids.iter().enumerate() {
            transaction
                .execute(
                    "UPDATE task_groups SET sort_order = ?1, updated_at = ?2 WHERE id = ?3",
                    params![position as i64, timestamp_ms(), id],
                )
                .map_err(|error| format!("保存分组顺序失败：{error}"))?;
        }
        transaction
            .commit()
            .map_err(|error| format!("完成分组排序失败：{error}"))
    })
}
