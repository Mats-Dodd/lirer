use sea_orm::DatabaseConnection;
use crate::models::async_feed_fetcher::AsyncFeedFetcher;

// Wrapper for database connection and async fetcher to use in Tauri state
pub struct AppState {
    pub db: DatabaseConnection,
    pub async_fetcher: Option<AsyncFeedFetcher>,
} 