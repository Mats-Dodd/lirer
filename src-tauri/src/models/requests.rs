use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFeedRequest {
    pub url: String,
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateFeedRequest {
    pub id: i32,
    pub url: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFeedEntryRequest {
    pub feed_id: i32,
    pub title: String,
    pub description: Option<String>,
    pub link: String,
    pub content: Option<String>,
    pub published_at: Option<String>, // ISO 8601 string
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFeedWithEntriesRequest {
    pub url: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub entries: Vec<CreateFeedEntryRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateFeedEntryRequest {
    pub id: i32,
    pub title: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub is_read: Option<bool>,
    pub is_starred: Option<bool>,
} 