use serde::{Deserialize, Serialize};
use crate::entities::{feed, feed_entry};

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