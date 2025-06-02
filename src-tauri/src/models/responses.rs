use serde::{Deserialize, Serialize};
use crate::entities::feed;

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