use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

pub struct SearchDb(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub score: f64,
}

fn get_db_path(app_data_dir: &str) -> PathBuf {
    PathBuf::from(app_data_dir).join("search_index.db")
}

pub fn init_search_db(app_data_dir: &str) -> SqliteResult<Connection> {
    let db_path = get_db_path(app_data_dir);
    
    if let Some(parent) = db_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    
    let conn = Connection::open(&db_path)?;
    
    let has_valid_config: bool = conn
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='notes_fts_config' AND sql LIKE '%key TEXT PRIMARY KEY%'",
            [],
            |row| row.get::<_, i32>(0),
        )
        .is_ok();
    
    if !has_valid_config {
        conn.execute("DROP TABLE IF EXISTS notes_fts_config", []).ok();
        conn.execute("DROP TABLE IF EXISTS notes_fts", []).ok();
        conn.execute("DROP TABLE IF EXISTS notes", []).ok();
        conn.execute("DROP TRIGGER IF EXISTS notes_ai", []).ok();
        conn.execute("DROP TRIGGER IF EXISTS notes_ad", []).ok();
        conn.execute("DROP TRIGGER IF EXISTS notes_au", []).ok();
    }
    
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY,
            path TEXT UNIQUE NOT NULL,
            title TEXT,
            content TEXT,
            tags TEXT,
            modified_at INTEGER
        );
        
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            title, content, tags,
            content='notes',
            content_rowid='id',
            tokenize='unicode61'
        );
        
        CREATE TABLE IF NOT EXISTS notes_fts_config (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        
        INSERT OR IGNORE INTO notes_fts_config (key, value) VALUES ('version', '1');
        
        CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
            INSERT INTO notes_fts(rowid, title, content, tags)
            VALUES (new.id, new.title, new.content, new.tags);
        END;
        
        CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
            INSERT INTO notes_fts(notes_fts, rowid, title, content, tags)
            VALUES('delete', old.id, old.title, old.content, old.tags);
        END;
        
        CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
            INSERT INTO notes_fts(notes_fts, rowid, title, content, tags)
            VALUES('delete', old.id, old.title, old.content, old.tags);
            INSERT INTO notes_fts(rowid, title, content, tags)
            VALUES (new.id, new.title, new.content, new.tags);
        END;
        "#,
    )?;
    
    Ok(conn)
}

#[tauri::command]
pub fn index_note(
    db: State<SearchDb>,
    path: String,
    title: String,
    content: String,
    tags: Vec<String>,
    modified_at: i64,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let tags_str = tags.join(",");
    
    conn.execute(
        r#"
        INSERT INTO notes (path, title, content, tags, modified_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(path) DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            tags = excluded.tags,
            modified_at = excluded.modified_at
        "#,
        rusqlite::params![path, title, content, tags_str, modified_at],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn remove_note_from_index(
    db: State<SearchDb>,
    path: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM notes WHERE path = ?1",
        rusqlite::params![path],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn search_notes(
    db: State<SearchDb>,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(50);
    
    let sanitized_query: String = query
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == ' ')
        .collect();
    
    let search_terms: Vec<String> = sanitized_query
        .split_whitespace()
        .map(|term| format!("{}*", term))
        .collect();
    
    if search_terms.is_empty() {
        return Ok(vec![]);
    }
    
    let fts_query = search_terms.join(" OR ");
    
    let sql = format!(
        r#"
        SELECT 
            n.path,
            COALESCE(n.title, '') as title,
            snippet(notes_fts, 1, '<<HIGHLIGHT>>', '<</HIGHLIGHT>>', '...', 30) as snippet,
            bm25(notes_fts) as score
        FROM notes_fts
        JOIN notes n ON notes_fts.rowid = n.id
        WHERE notes_fts MATCH ?1
        ORDER BY score ASC
        LIMIT {}
        "#,
        limit
    );
    
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    
    let results = stmt
        .query_map(rusqlite::params![fts_query], |row| {
            Ok(SearchResult {
                path: row.get(0)?,
                title: row.get(1)?,
                snippet: row.get(2)?,
                score: row.get::<_, f64>(3)? * -1.0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(results)
}

#[tauri::command]
pub fn rebuild_index(
    db: State<SearchDb>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM notes", [])
        .map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO notes_fts(notes_fts) VALUES('delete-all')",
        [],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn get_index_stats(
    db: State<SearchDb>,
) -> Result<serde_json::Value, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "total_notes": count
    }))
}
