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