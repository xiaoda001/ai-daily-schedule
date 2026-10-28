mod commands;
mod models;
mod store;

use models::AppState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let database = store::open_database(&app.handle()).map_err(std::io::Error::other)?;
            app.manage(AppState {
                database: std::sync::Mutex::new(database),
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::groups::list_groups,
            commands::groups::create_group,
            commands::groups::rename_group,
            commands::groups::delete_group,
            commands::groups::reorder_groups,
            commands::groups::archive_group,
            commands::groups::restore_group,
            commands::settings::get_storage_directory,
            commands::settings::move_storage_directory,
            commands::tasks::list_tasks,
            commands::tasks::get_task_counts,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::set_task_status,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run task manager");
}
