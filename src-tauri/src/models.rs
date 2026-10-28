use rusqlite::Connection;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;

pub(crate) struct AppState {
    pub(crate) database: Mutex<Database>,
}

pub(crate) struct Database {
    pub(crate) connection: Connection,
    pub(crate) path: PathBuf,
    pub(crate) settings_path: PathBuf,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TaskGroup {
    pub(crate) id: i64,
    pub(crate) name: String,
    pub(crate) task_count: i64,
    pub(crate) archived: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Task {
    pub(crate) id: i64,
    pub(crate) title: String,
    pub(crate) description: String,
    pub(crate) group_id: i64,
    pub(crate) status: String,
    pub(crate) created_at: i64,
    pub(crate) updated_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TaskCounts {
    pub(crate) todo: i64,
    pub(crate) in_progress: i64,
    pub(crate) completed: i64,
    pub(crate) total: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeleteGroupOutcome {
    pub(crate) deleted_tasks: i64,
}
