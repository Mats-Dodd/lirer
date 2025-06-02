use sea_orm::DatabaseConnection;

// Wrapper for database connection to use in Tauri state
pub struct AppState {
    pub db: DatabaseConnection,
} 