use serde::{Deserialize, Serialize};
use crate::entities::{feed, feed_entry};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedResponse {
    pub id: i32,
    pub url: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_fetched_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedWithEntriesResponse {
    pub id: i32,
    pub url: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_fetched_at: Option<String>,
    pub entries: Vec<FeedEntryResponse>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedEntryResponse {
    pub id: i32,
    pub feed_id: i32,
    pub title: String,
    pub description: Option<String>,
    pub link: String,
    pub content: Option<String>,
    pub published_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub is_read: bool,
    pub is_starred: bool,
}

// Convert entity model to response
impl From<feed::Model> for FeedResponse {
    fn from(model: feed::Model) -> Self {
        Self {
            id: model.id,
            url: model.url,
            title: model.title,
            description: model.description,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
            last_fetched_at: model.last_fetched_at.map(|dt| dt.to_string()),
        }
    }
}

impl From<feed_entry::Model> for FeedEntryResponse {
    fn from(model: feed_entry::Model) -> Self {
        Self {
            id: model.id,
            feed_id: model.feed_id,
            title: model.title,
            description: model.description,
            link: model.link,
            content: model.content,
            published_at: model.published_at.map(|dt| dt.to_string()),
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
            is_read: model.is_read,
            is_starred: model.is_starred,
        }
    }
}

// Refresh-related response structures
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshResponse {
    pub success: bool,
    pub message: String,
    pub total_feeds: usize,
    pub estimated_completion_time: Option<u64>, // seconds
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshProgress {
    pub is_active: bool,
    pub total_feeds: usize,
    pub completed_feeds: usize,
    pub failed_feeds: usize,
    pub current_feed_url: Option<String>,
    pub progress_percentage: f32,
    pub estimated_time_remaining: Option<u64>, // seconds
    pub errors: Vec<RefreshError>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshError {
    pub feed_url: String,
    pub feed_title: Option<String>,
    pub error_message: String,
    pub error_type: String, // "network", "parse", "timeout", "rate_limited", "too_many_retries"
    pub retry_count: u32,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshSummary {
    pub timestamp: String,
    pub total_processed: usize,
    pub successful_count: usize,
    pub failed_count: usize,
    pub duration_seconds: u64,
    pub feeds_updated: Vec<FeedRefreshStatus>,
    pub errors: Vec<RefreshError>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeedRefreshStatus {
    pub feed_id: i32,
    pub feed_url: String,
    pub feed_title: Option<String>,
    pub status: String, // "success", "failed", "skipped"
    pub entries_added: usize,
    pub last_fetched_at: String,
    pub error: Option<RefreshError>,
} 