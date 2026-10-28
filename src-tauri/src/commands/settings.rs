use crate::{
    models::AppState,
    store::{migrate_storage_directory, AppResult},
};
use tauri::State;

#[tauri::command]
pub(crate) fn get_storage_directory(state: State<'_, AppState>) -> AppResult<String> {
    let database = state
        .database
        .lock()
        .map_err(|_| "数据库正在使用，请稍后重试。".to_owned())?;
    let directory = database
        .path
        .parent()
        .ok_or_else(|| "当前数据库路径无效。".to_owned())?;
    Ok(directory.to_string_lossy().into_owned())
}

#[tauri::command]
pub(crate) fn move_storage_directory(
    state: State<'_, AppState>,
    directory: String,
) -> AppResult<String> {
    migrate_storage_directory(&state, directory)
}
