use sea_orm::*;
use tauri::State;
use chrono;
use crate::entities::{prelude::*, *};
use crate::models::{AppState, CreateFeedRequest, UpdateFeedRequest, FeedResponse, fetch_and_parse_feed, parse_feed_content, ParsedFeed, FetchPriority};

// CREATE - Insert a new feed
#[tauri::command]
pub async fn create_feed(
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
pub async fn get_all_feeds(state: State<'_, AppState>) -> Result<Vec<FeedResponse>, String> {
    let db = &state.db;
    
    let feeds = Feed::find()
        .all(db)
        .await
        .map_err(|e| format!("Failed to fetch feeds: {}", e))?;
    
    Ok(feeds.into_iter().map(|feed| feed.into()).collect())
}

// READ - Get feed by ID
#[tauri::command]
pub async fn get_feed_by_id(
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
pub async fn get_feed_by_url(
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
pub async fn update_feed(
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
pub async fn update_feed_last_fetched(
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
pub async fn delete_feed(state: State<'_, AppState>, id: i32) -> Result<String, String> {
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
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// FEED PARSING COMMANDS

#[tauri::command]
pub async fn fetch_and_parse_feed_command(url: String) -> Result<ParsedFeed, String> {
    fetch_and_parse_feed(&url)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn parse_feed_content_command(content: String) -> Result<ParsedFeed, String> {
    parse_feed_content(&content)
        .map_err(|e| e.to_string())
}

// ASYNC FEED FETCHER COMMANDS

#[tauri::command]
pub async fn start_async_fetcher(state: State<'_, AppState>) -> Result<String, String> {
    if let Some(fetcher) = &state.async_fetcher {
        fetcher.start().await;
        Ok("Async feed fetcher started successfully".to_string())
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

#[tauri::command]
pub async fn stop_async_fetcher(state: State<'_, AppState>) -> Result<String, String> {
    if let Some(fetcher) = &state.async_fetcher {
        fetcher.stop().await;
        Ok("Async feed fetcher stopped successfully".to_string())
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

#[tauri::command]
pub async fn get_async_fetcher_status(state: State<'_, AppState>) -> Result<bool, String> {
    if let Some(fetcher) = &state.async_fetcher {
        Ok(fetcher.is_running().await)
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

#[tauri::command]
pub fn queue_feed_for_async_fetch(
    state: State<'_, AppState>,
    url: String,
    priority: Option<String>,
) -> Result<String, String> {
    if let Some(fetcher) = &state.async_fetcher {
        let fetch_priority = match priority.as_deref() {
            Some("low") => FetchPriority::Low,
            Some("normal") => FetchPriority::Normal,
            Some("high") => FetchPriority::High,
            Some("critical") => FetchPriority::Critical,
            _ => FetchPriority::Normal,
        };
        
        fetcher.queue_feed(url.clone(), fetch_priority)
            .map_err(|e| format!("Failed to queue feed: {}", e))?;
        
        Ok(format!("Feed '{}' queued for async fetching", url))
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

#[tauri::command]
pub async fn get_async_fetch_results(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    if let Some(fetcher) = &state.async_fetcher {
        let results = fetcher.get_results().await;
        
        // Convert results to a simpler format for the frontend
        let formatted_results: Vec<String> = results.into_iter().map(|result| {
            match result.result {
                Ok(feed) => format!("✅ {}: Successfully fetched '{}' with {} entries", 
                                  result.url, feed.title, feed.entries.len()),
                Err(error) => format!("❌ {}: Failed - {}", result.url, error),
            }
        }).collect();
        
        Ok(formatted_results)
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

#[tauri::command]
pub async fn fetch_multiple_feeds_async(
    state: State<'_, AppState>,
    urls: Vec<String>,
    priority: Option<String>,
) -> Result<String, String> {
    if let Some(fetcher) = &state.async_fetcher {
        let fetch_priority = match priority.as_deref() {
            Some("low") => FetchPriority::Low,
            Some("normal") => FetchPriority::Normal,
            Some("high") => FetchPriority::High,
            Some("critical") => FetchPriority::Critical,
            _ => FetchPriority::Normal,
        };
        
        let mut queued_count = 0;
        for url in urls {
            if fetcher.queue_feed(url, fetch_priority.clone()).is_ok() {
                queued_count += 1;
            }
        }
        
        Ok(format!("Successfully queued {} feeds for async fetching", queued_count))
    } else {
        Err("Async feed fetcher not available".to_string())
    }
} 