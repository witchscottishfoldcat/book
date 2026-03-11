mod commands;
mod error;

pub use error::{Error, Result};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::file_commands::read_directory,
            commands::file_commands::read_file,
            commands::file_commands::write_file,
            commands::file_commands::create_file,
            commands::file_commands::create_folder,
            commands::file_commands::delete_file,
            commands::file_commands::rename_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
