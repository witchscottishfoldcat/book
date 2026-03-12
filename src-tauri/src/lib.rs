mod commands;
mod error;

pub use error::{Error, Result};
use commands::search_commands::{SearchDb, init_search_db};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("mdnotes");
    
    let search_db = init_search_db(app_data_dir.to_str().unwrap_or("."))
        .expect("Failed to initialize search database");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(SearchDb(std::sync::Mutex::new(search_db)))
        .invoke_handler(tauri::generate_handler![
            commands::file_commands::read_directory,
            commands::file_commands::read_file,
            commands::file_commands::write_file,
            commands::file_commands::create_file,
            commands::file_commands::create_folder,
            commands::file_commands::delete_file,
            commands::file_commands::rename_file,
            commands::file_commands::open_in_explorer,
            commands::search_commands::index_note,
            commands::search_commands::remove_note_from_index,
            commands::search_commands::search_notes,
            commands::search_commands::rebuild_index,
            commands::search_commands::get_index_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
