use crate::models::Database;
use crate::models::{AppState, Task};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, time::SystemTime};
use tauri::Manager;
use tauri::State;

pub(crate) type AppResult<T> = Result<T, String>;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageLocation {
    directory: String,
}

pub(crate) fn open_database(app: &tauri::AppHandle) -> AppResult<Database> {
    let default_directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法读取应用数据目录：{error}"))?;
    let settings_directory = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("无法读取应用设置目录：{error}"))?;
    fs::create_dir_all(&default_directory)
        .map_err(|error| format!("无法创建应用数据目录：{error}"))?;
    fs::create_dir_all(&settings_directory)
        .map_err(|error| format!("无法创建应用设置目录：{error}"))?;
    let settings_path = settings_directory.join("storage-location.json");
    let database_path = if settings_path.exists() {
        let contents = fs::read_to_string(&settings_path)
            .map_err(|error| format!("无法读取数据存储设置：{error}"))?;
        let location: StorageLocation = serde_json::from_str(&contents)
            .map_err(|error| format!("数据存储设置格式无效：{error}"))?;
        let configured_directory = PathBuf::from(location.directory);
        let configured_path = configured_directory.join("tasks.sqlite3");
        if !configured_path.is_file() {
            return Err(format!(
                "设置的数据文件不存在：{}。请恢复该目录或联系支持。",
                configured_path.display()
            ));
        }
        configured_path
    } else {
        default_directory.join("tasks.sqlite3")
    };
    let connection = initialize_connection(database_path.clone())?;
    Ok(Database {
        connection,
        path: database_path,
        settings_path,
    })
}

pub(crate) fn migrate_storage_directory(
    state: &State<'_, AppState>,
    selected_directory: String,
) -> AppResult<String> {
    let selected_directory = PathBuf::from(selected_directory.trim());
    if !selected_directory.is_dir() {
        return Err("所选位置不是有效目录。".to_owned());
    }
    let selected_directory = selected_directory
        .canonicalize()
        .map_err(|error| format!("无法读取所选目录：{error}"))?;
    let mut database = state
        .database
        .lock()
        .map_err(|_| "数据库正在使用，请稍后重试。".to_owned())?;
    let current_directory = database
        .path
        .parent()
        .ok_or_else(|| "当前数据库路径无效。".to_owned())?
        .canonicalize()
        .map_err(|error| format!("无法读取当前数据目录：{error}"))?;
    if selected_directory == current_directory {
        return Ok(selected_directory.to_string_lossy().into_owned());
    }

    let destination = selected_directory.join("tasks.sqlite3");
    if destination.exists() {
        return Err("所选目录已存在 tasks.sqlite3，为避免覆盖数据，请选择其他目录。".to_owned());
    }
    let checkpoint: (i64, i64, i64) = database
        .connection
        .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|error| format!("无法准备数据库迁移：{error}"))?;
    if checkpoint.0 != 0 {
        return Err("数据库仍有操作未完成，请稍后重试迁移。".to_owned());
    }

    let temporary =
        selected_directory.join(format!("tasks.sqlite3.migrating-{}", std::process::id()));
    if temporary.exists() {
        return Err("迁移临时文件已存在，请删除后重试。".to_owned());
    }
    fs::copy(&database.path, &temporary).map_err(|error| format!("复制任务数据库失败：{error}"))?;
    let validation_connection = initialize_connection(temporary.clone())?;
    let integrity: String = validation_connection
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|error| format!("校验迁移数据失败：{error}"))?;
    if integrity != "ok" {
        return Err("目标数据库校验失败，原数据未切换。".to_owned());
    }
    let validation_checkpoint: (i64, i64, i64) = validation_connection
        .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|error| format!("无法完成数据校验：{error}"))?;
    if validation_checkpoint.0 != 0 {
        return Err("目标数据库仍有操作未完成，无法完成迁移。".to_owned());
    }
    drop(validation_connection);
    fs::rename(&temporary, &destination)
        .map_err(|error| format!("无法启用新的数据文件：{error}"))?;

    let connection = initialize_connection(destination.clone())?;
    let settings = StorageLocation {
        directory: selected_directory.to_string_lossy().into_owned(),
    };
    let serialized =
        serde_json::to_vec(&settings).map_err(|error| format!("无法保存数据存储设置：{error}"))?;
    fs::write(&database.settings_path, serialized)
        .map_err(|error| format!("无法保存数据存储设置：{error}"))?;
    database.connection = connection;
    database.path = destination;
    Ok(selected_directory.to_string_lossy().into_owned())
}

pub(crate) fn timestamp_ms() -> i64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub(crate) fn validate_name(value: &str, field: &str, max_chars: usize) -> AppResult<String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{field}不能为空。"));
    }
    if value.chars().count() > max_chars {
        return Err(format!("{field}不能超过 {max_chars} 个字符。"));
    }
    Ok(value.to_owned())
}

pub(crate) fn validate_status(status: &str) -> AppResult<()> {
    match status {
        "todo" | "in_progress" | "completed" => Ok(()),
        _ => Err("任务状态无效。".to_owned()),
    }
}

pub(crate) fn validate_task_filter(filter: &str) -> AppResult<()> {
    if filter == "active" || filter == "all" {
        return Ok(());
    }
    validate_status(filter)
}

pub(crate) fn initialize_connection(path: PathBuf) -> AppResult<Connection> {
    let connection =
        Connection::open(path).map_err(|error| format!("无法打开本机任务数据库：{error}"))?;
    connection
        .execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 3000;
             CREATE TABLE IF NOT EXISTS app_meta (
                 key TEXT PRIMARY KEY,
                 value TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS task_groups (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) > 0),
                 sort_order INTEGER NOT NULL DEFAULT 0,
                 archived INTEGER NOT NULL DEFAULT 0,
                 created_at INTEGER NOT NULL,
                 updated_at INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS tasks (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 title TEXT NOT NULL CHECK(length(trim(title)) > 0),
                 description TEXT NOT NULL DEFAULT '',
                 group_id INTEGER NOT NULL REFERENCES task_groups(id) ON DELETE CASCADE,
                 status TEXT NOT NULL CHECK(status IN ('todo', 'in_progress', 'completed')),
                 created_at INTEGER NOT NULL,
                 updated_at INTEGER NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_tasks_group_status_created
                 ON tasks(group_id, status, created_at DESC);
             CREATE INDEX IF NOT EXISTS idx_tasks_status_created
                 ON tasks(status, created_at DESC);",
        )
        .map_err(|error| format!("无法初始化任务数据库：{error}"))?;

    ensure_group_sort_order(&connection).map_err(|error| format!("无法初始化分组排序：{error}"))?;
    ensure_group_archived(&connection).map_err(|error| format!("无法初始化分组归档状态：{error}"))?;
    seed_initial_group(&connection).map_err(|error| format!("无法初始化默认分组：{error}"))?;
    Ok(connection)
}

fn ensure_group_sort_order(connection: &Connection) -> rusqlite::Result<()> {
    let has_sort_order = {
        let mut statement = connection.prepare("PRAGMA table_info(task_groups)")?;
        let columns = statement.query_map([], |row| row.get::<_, String>("name"))?;
        columns
            .collect::<rusqlite::Result<Vec<_>>>()?
            .iter()
            .any(|name| name == "sort_order")
    };
    if !has_sort_order {
        connection.execute(
            "ALTER TABLE task_groups ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
        connection.execute("UPDATE task_groups SET sort_order = id", [])?;
    }
    Ok(())
}

fn ensure_group_archived(connection: &Connection) -> rusqlite::Result<()> {
    let has_archived = {
        let mut statement = connection.prepare("PRAGMA table_info(task_groups)")?;
        let columns = statement.query_map([], |row| row.get::<_, String>("name"))?;
        columns
            .collect::<rusqlite::Result<Vec<_>>>()?
            .iter()
            .any(|name| name == "archived")
    };
    if !has_archived {
        connection.execute(
            "ALTER TABLE task_groups ADD COLUMN archived INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    Ok(())
}

fn seed_initial_group(connection: &Connection) -> rusqlite::Result<()> {
    let seeded: Option<String> = connection
        .query_row(
            "SELECT value FROM app_meta WHERE key = 'initial_group_seeded'",
            [],
            |row| row.get(0),
        )
        .optional()?;
    if seeded.is_some() {
        return Ok(());
    }

    let timestamp = timestamp_ms();
    connection.execute(
        "INSERT INTO task_groups(name, created_at, updated_at) VALUES (?1, ?2, ?2)",
        params!["收集箱", timestamp],
    )?;
    connection.execute(
        "INSERT INTO app_meta(key, value) VALUES ('initial_group_seeded', '1')",
        [],
    )?;
    Ok(())
}

pub(crate) fn with_connection<T>(
    state: &State<'_, AppState>,
    f: impl FnOnce(&Connection) -> AppResult<T>,
) -> AppResult<T> {
    let database = state
        .database
        .lock()
        .map_err(|_| "数据库操作暂时不可用，请重启应用后重试。".to_owned())?;
    f(&database.connection)
}

pub(crate) fn map_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get("id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        group_id: row.get("group_id")?,
        status: row.get("status")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub(crate) fn fetch_task(connection: &Connection, id: i64) -> AppResult<Task> {
    connection
        .query_row(
            "SELECT id, title, description, group_id, status, created_at, updated_at
             FROM tasks WHERE id = ?1",
            [id],
            map_task,
        )
        .optional()
        .map_err(|error| format!("读取任务失败：{error}"))?
        .ok_or_else(|| "找不到这条任务。".to_owned())
}

pub(crate) fn ensure_group_exists(connection: &Connection, group_id: i64) -> AppResult<()> {
    let exists: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM task_groups WHERE id = ?1)",
            [group_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("检查任务分组失败：{error}"))?;
    if exists {
        Ok(())
    } else {
        Err("所选分组已不存在，请重新选择。".to_owned())
    }
}
