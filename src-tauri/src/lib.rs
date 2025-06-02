use sea_orm::*;
use std::env;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono;

mod entities;
use entities::{prelude::*, *};

// Wrapper for database connection to use in Tauri state
pub struct AppState {
    pub db: DatabaseConnection,
}

// Structs for API communication
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

async fn setup_database() -> Result<DatabaseConnection, DbErr> {
    dotenv::dotenv().ok();
    
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in environment variables or .env file");
    
    let db = Database::connect(&database_url).await?;
    Ok(db)
}

// CREATE - Insert a new feed
#[tauri::command]
async fn create_feed(
    state: State<'_, AppState>,
    request: CreateFeedRequest,
) -> Result<FeedResponse, String> {
    let db = &state.db;
    
    let now = chrono::Utc::now().naive_utc();
    
    let new_feed = feed::ActiveModel {
        url: ActiveValue::Set(request.url),
        title: ActiveValue::Set(request.title),
        description: ActiveValue::Set(request.description),
        created_at: ActiveValue::Set(now),
        updated_at: ActiveValue::Set(now),
        last_fetched_at: ActiveValue::Set(None),
        ..Default::default()
    };
    
    let result = Feed::insert(new_feed)
        .exec(db)
        .await
        .map_err(|e| format!("Failed to create feed: {}", e))?;
    
    // Fetch the created feed to return it
    let created_feed = Feed::find_by_id(result.last_insert_id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch created feed: {}", e))?
        .ok_or("Failed to find created feed")?;
    
    Ok(created_feed.into())
}

// READ - Get all feeds
#[tauri::command]
async fn get_all_feeds(state: State<'_, AppState>) -> Result<Vec<FeedResponse>, String> {
    let db = &state.db;
    
    let feeds = Feed::find()
        .all(db)
        .await
        .map_err(|e| format!("Failed to fetch feeds: {}", e))?;
    
    Ok(feeds.into_iter().map(|feed| feed.into()).collect())
}

// READ - Get feed by ID
#[tauri::command]
async fn get_feed_by_id(
    state: State<'_, AppState>,
    id: i32,
) -> Result<Option<FeedResponse>, String> {
    let db = &state.db;
    
    let feed = Feed::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch feed: {}", e))?;
    
    Ok(feed.map(|f| f.into()))
}

// READ - Get feeds by URL (since URL is unique)
#[tauri::command]
async fn get_feed_by_url(
    state: State<'_, AppState>,
    url: String,
) -> Result<Option<FeedResponse>, String> {
    let db = &state.db;
    
    let feed = Feed::find()
        .filter(feed::Column::Url.eq(url))
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch feed by URL: {}", e))?;
    
    Ok(feed.map(|f| f.into()))
}

// UPDATE - Update an existing feed
#[tauri::command]
async fn update_feed(
    state: State<'_, AppState>,
    request: UpdateFeedRequest,
) -> Result<FeedResponse, String> {
    let db = &state.db;
    
    // First, find the existing feed
    let existing_feed = Feed::find_by_id(request.id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch feed: {}", e))?
        .ok_or("Feed not found")?;
    
    // Create an active model for updating
    let mut updated_feed: feed::ActiveModel = existing_feed.into();
    
    // Update fields if provided
    if let Some(url) = request.url {
        updated_feed.url = ActiveValue::Set(url);
    }
    if let Some(title) = request.title {
        updated_feed.title = ActiveValue::Set(Some(title));
    }
    if let Some(description) = request.description {
        updated_feed.description = ActiveValue::Set(Some(description));
    }
    
    // Always update the updated_at timestamp
    updated_feed.updated_at = ActiveValue::Set(chrono::Utc::now().naive_utc());
    
    let result = updated_feed
        .update(db)
        .await
        .map_err(|e| format!("Failed to update feed: {}", e))?;
    
    Ok(result.into())
}

// UPDATE - Update last_fetched_at timestamp
#[tauri::command]
async fn update_feed_last_fetched(
    state: State<'_, AppState>,
    id: i32,
) -> Result<FeedResponse, String> {
    let db = &state.db;
    
    let existing_feed = Feed::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch feed: {}", e))?
        .ok_or("Feed not found")?;
    
    let mut updated_feed: feed::ActiveModel = existing_feed.into();
    let now = chrono::Utc::now().naive_utc();
    
    updated_feed.last_fetched_at = ActiveValue::Set(Some(now));
    updated_feed.updated_at = ActiveValue::Set(now);
    
    let result = updated_feed
        .update(db)
        .await
        .map_err(|e| format!("Failed to update feed last fetched: {}", e))?;
    
    Ok(result.into())
}

// DELETE - Delete a feed by ID
#[tauri::command]
async fn delete_feed(state: State<'_, AppState>, id: i32) -> Result<String, String> {
    let db = &state.db;
    
    // First check if the feed exists
    let existing_feed = Feed::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch feed: {}", e))?
        .ok_or("Feed not found")?;
    
    // Delete the feed
    let delete_model = feed::ActiveModel {
        id: ActiveValue::Set(existing_feed.id),
        ..Default::default()
    };
    
    delete_model
        .delete(db)
        .await
        .map_err(|e| format!("Failed to delete feed: {}", e))?;
    
    Ok(format!("Feed with ID {} deleted successfully", id))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::block_on(async {
        let db = setup_database().await.expect("Failed to setup database");
        let app_state = AppState { db };

        tauri::Builder::default()
            .manage(app_state)
            .plugin(tauri_plugin_opener::init())
            .invoke_handler(tauri::generate_handler![
                greet,
                create_feed,
                get_all_feeds,
                get_feed_by_id,
                get_feed_by_url,
                update_feed,
                update_feed_last_fetched,
                delete_feed
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}
