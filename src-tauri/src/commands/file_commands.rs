use crate::{Error, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<DirEntry>> {
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err(Error::NotFound(dir_path.to_path_buf()));
    }

    if !dir_path.is_dir() {
        return Err(Error::InvalidPath(format!("{} is not a directory", path)));
    }

    let entries: Vec<DirEntry> = fs::read_dir(dir_path)?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            !name_str.starts_with('.')
        })
        .map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            let path = entry.path().to_string_lossy().to_string();
            let is_directory = entry.path().is_dir();

            DirEntry {
                name,
                path,
                is_directory,
            }
        })
        .collect();

    Ok(entries)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(Error::NotFound(file_path.to_path_buf()));
    }

    let content = fs::read_to_string(file_path)?;
    Ok(content)
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<()> {
    let file_path = Path::new(&path);

    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    fs::write(file_path, content)?;
    Ok(())
}

#[tauri::command]
pub fn create_file(parent_path: String, file_name: String) -> Result<String> {
    let parent = Path::new(&parent_path);
    let file_path = parent.join(&file_name);

    if file_path.exists() {
        return Err(Error::InvalidPath(format!(
            "File already exists: {}",
            file_path.display()
        )));
    }

    fs::write(&file_path, "")?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_folder(parent_path: String, folder_name: String) -> Result<String> {
    let parent = Path::new(&parent_path);
    let folder_path = parent.join(&folder_name);

    if folder_path.exists() {
        return Err(Error::InvalidPath(format!(
            "Folder already exists: {}",
            folder_path.display()
        )));
    }

    fs::create_dir(&folder_path)?;
    Ok(folder_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<()> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(Error::NotFound(file_path.to_path_buf()));
    }

    if file_path.is_dir() {
        fs::remove_dir_all(file_path)?;
    } else {
        fs::remove_file(file_path)?;
    }

    Ok(())
}

#[tauri::command]
pub fn rename_file(old_path: String, new_name: String) -> Result<String> {
    let old = Path::new(&old_path);

    if !old.exists() {
        return Err(Error::NotFound(old.to_path_buf()));
    }

    let parent = old
        .parent()
        .ok_or_else(|| Error::InvalidPath("Cannot get parent directory".to_string()))?;

    let new = parent.join(&new_name);

    if new.exists() {
        return Err(Error::InvalidPath(format!(
            "Target already exists: {}",
            new.display()
        )));
    }

    fs::rename(old, &new)?;
    Ok(new.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<()> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(Error::NotFound(file_path.to_path_buf()));
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| Error::Io(e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| Error::Io(e))?;
    }

    #[cfg(target_os = "linux")]
    {
        let path_str = file_path.to_string_lossy().to_string();
        std::process::Command::new("xdg-open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| Error::Io(e))?;
    }

    Ok(())
}
