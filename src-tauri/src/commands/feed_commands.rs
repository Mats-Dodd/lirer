use sea_orm::*;
use tauri::State;
use chrono;
use crate::entities::{prelude::*, *};
use crate::models::{AppState, CreateFeedRequest, UpdateFeedRequest, FeedResponse, FeedRefreshStatus, RefreshResponse, RefreshProgress, RefreshSummary, RefreshError, fetch_and_parse_feed, parse_feed_content, ParsedFeed, FetchPriority};

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

// REFRESH COMMANDS

#[tauri::command]
pub async fn refresh_all_feeds(state: State<'_, AppState>) -> Result<RefreshResponse, String> {
    let db = &state.db;
    
    // Get all feeds from database
    let feeds = Feed::find()
        .all(db)
        .await
        .map_err(|e| format!("Failed to fetch feeds: {}", e))?;
    
    if feeds.is_empty() {
        return Ok(RefreshResponse {
            success: false,
            message: "No feeds found to refresh".to_string(),
            total_feeds: 0,
            estimated_completion_time: None,
        });
    }
    
    let total_feeds = feeds.len();
    
    if let Some(fetcher) = &state.async_fetcher {
        // Start the refresh operation tracking
        fetcher.start_refresh_operation(total_feeds).await;
        
        // Start async fetcher if not running
        if !fetcher.is_running().await {
            fetcher.start().await;
        }
        
        // Queue all feeds for high-priority fetching
        let mut queued_count = 0;
        for feed in feeds {
            if fetcher.queue_feed(feed.url.clone(), FetchPriority::High).is_ok() {
                queued_count += 1;
            }
        }
        
        // Estimate completion time (rough calculation: 2 seconds per feed)
        let estimated_time = Some((total_feeds as u64) * 2);
        
        Ok(RefreshResponse {
            success: true,
            message: format!("Started refreshing {} feeds", queued_count),
            total_feeds: queued_count,
            estimated_completion_time: estimated_time,
        })
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

#[tauri::command]
pub async fn refresh_single_feed(state: State<'_, AppState>, feed_id: i32) -> Result<RefreshResponse, String> {
    let db = &state.db;
    
    // Get specific feed by ID
    let feed = Feed::find_by_id(feed_id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch feed: {}", e))?
        .ok_or("Feed not found")?;
    
    if let Some(fetcher) = &state.async_fetcher {
        // Start the refresh operation tracking for single feed
        fetcher.start_refresh_operation(1).await;
        
        // Start async fetcher if not running
        if !fetcher.is_running().await {
            fetcher.start().await;
        }
        
        // Queue the feed for critical priority fetching
        fetcher.queue_feed(feed.url.clone(), FetchPriority::Critical)
            .map_err(|e| format!("Failed to queue feed: {}", e))?;
        
        Ok(RefreshResponse {
            success: true,
            message: format!("Started refreshing feed: {}", feed.title.unwrap_or(feed.url.clone())),
            total_feeds: 1,
            estimated_completion_time: Some(5), // 5 seconds estimate for single feed
        })
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

#[tauri::command]
pub async fn get_refresh_progress(state: State<'_, AppState>) -> Result<RefreshProgress, String> {
    if let Some(fetcher) = &state.async_fetcher {
        Ok(fetcher.get_refresh_progress().await)
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

#[tauri::command]
pub async fn get_last_refresh_summary(state: State<'_, AppState>) -> Result<Option<RefreshSummary>, String> {
    if let Some(fetcher) = &state.async_fetcher {
        Ok(fetcher.get_last_refresh_summary().await)
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

// Background refresh processor - handles database integration
#[tauri::command]
pub async fn process_refresh_results(state: State<'_, AppState>) -> Result<String, String> {
    let db = &state.db;
    
    if let Some(fetcher) = &state.async_fetcher {
        let results = fetcher.get_results().await;
        let mut processed_count = 0;
        
        for result in results {
            // Find the feed in database by URL
            let feed_opt = Feed::find()
                .filter(feed::Column::Url.eq(&result.url))
                .one(db)
                .await
                .map_err(|e| format!("Failed to find feed by URL: {}", e))?;
            
            if let Some(feed) = feed_opt {
                match result.result {
                    Ok(parsed_feed) => {
                        // Successfully parsed feed - save entries to database
                        match save_parsed_feed_to_database(db, &feed, &parsed_feed).await {
                            Ok(entries_added) => {
                                // Update feed's last_fetched_at
                                let mut updated_feed: feed::ActiveModel = feed.clone().into();
                                updated_feed.last_fetched_at = ActiveValue::Set(Some(chrono::Utc::now().naive_utc()));
                                let _ = updated_feed.update(db).await;
                                
                                // Create successful feed status
                                let feed_status = FeedRefreshStatus {
                                    feed_id: feed.id,
                                    feed_url: feed.url.clone(),
                                    feed_title: feed.title.clone(),
                                    status: "success".to_string(),
                                    entries_added,
                                    last_fetched_at: chrono::Utc::now().to_rfc3339(),
                                    error: None,
                                };
                                
                                // Update progress
                                fetcher.complete_feed_refresh(feed_status, None).await;
                                processed_count += 1;
                            }
                            Err(save_error) => {
                                // Database save failed
                                let refresh_error = RefreshError {
                                    feed_url: result.url.clone(),
                                    feed_title: feed.title.clone(),
                                    error_message: format!("Database save failed: {}", save_error),
                                    error_type: "database".to_string(),
                                    retry_count: result.retry_count,
                                    timestamp: chrono::Utc::now().to_rfc3339(),
                                };
                                
                                let feed_status = FeedRefreshStatus {
                                    feed_id: feed.id,
                                    feed_url: feed.url.clone(),
                                    feed_title: feed.title.clone(),
                                    status: "failed".to_string(),
                                    entries_added: 0,
                                    last_fetched_at: chrono::Utc::now().to_rfc3339(),
                                    error: Some(refresh_error.clone()),
                                };
                                
                                fetcher.complete_feed_refresh(feed_status, Some(refresh_error)).await;
                            }
                        }
                    }
                    Err(fetch_error) => {
                        // Feed fetch failed
                        let refresh_error = RefreshError {
                            feed_url: result.url.clone(),
                            feed_title: feed.title.clone(),
                            error_message: fetch_error.to_string(),
                            error_type: match fetch_error {
                                crate::models::async_feed_fetcher::FeedFetchError::NetworkError(_) => "network",
                                crate::models::async_feed_fetcher::FeedFetchError::ParseError(_) => "parse",
                                crate::models::async_feed_fetcher::FeedFetchError::Timeout => "timeout",
                                crate::models::async_feed_fetcher::FeedFetchError::RateLimited => "rate_limited",
                                crate::models::async_feed_fetcher::FeedFetchError::TooManyRetries => "too_many_retries",
                            }.to_string(),
                            retry_count: result.retry_count,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                        };
                        
                        let feed_status = FeedRefreshStatus {
                            feed_id: feed.id,
                            feed_url: feed.url.clone(),
                            feed_title: feed.title.clone(),
                            status: "failed".to_string(),
                            entries_added: 0,
                            last_fetched_at: chrono::Utc::now().to_rfc3339(),
                            error: Some(refresh_error.clone()),
                        };
                        
                        fetcher.complete_feed_refresh(feed_status, Some(refresh_error)).await;
                    }
                }
            }
        }
        
        Ok(format!("Processed {} refresh results", processed_count))
    } else {
        Err("Async feed fetcher not available".to_string())
    }
}

// Helper function to save parsed feed entries to database
async fn save_parsed_feed_to_database(
    db: &DatabaseConnection,
    feed: &feed::Model,
    parsed_feed: &ParsedFeed,
) -> Result<usize, String> {
    use crate::entities::feed_entry;
    let mut entries_added = 0;
    
    for entry in &parsed_feed.entries {
        // Check if entry already exists (duplicate detection by link)
        let existing_entry = feed_entry::Entity::find()
            .filter(feed_entry::Column::FeedId.eq(feed.id))
            .filter(feed_entry::Column::Link.eq(&entry.link))
            .one(db)
            .await
            .map_err(|e| format!("Failed to check for existing entry: {}", e))?;
        
        if existing_entry.is_none() {
            // Entry doesn't exist, create new one
            let new_entry = feed_entry::ActiveModel {
                feed_id: ActiveValue::Set(feed.id),
                title: ActiveValue::Set(entry.title.clone()),
                description: ActiveValue::Set(entry.description.clone()),
                link: ActiveValue::Set(entry.link.clone()),
                content: ActiveValue::Set(entry.content.clone()),
                published_at: ActiveValue::Set(entry.published_at.map(|dt| dt.naive_utc())),
                created_at: ActiveValue::Set(chrono::Utc::now().naive_utc()),
                updated_at: ActiveValue::Set(chrono::Utc::now().naive_utc()),
                is_read: ActiveValue::Set(false),
                is_starred: ActiveValue::Set(false),
                ..Default::default()
            };
            
            feed_entry::Entity::insert(new_entry)
                .exec(db)
                .await
                .map_err(|e| format!("Failed to insert feed entry: {}", e))?;
            
            entries_added += 1;
        }
    }
    
    Ok(entries_added)
} 