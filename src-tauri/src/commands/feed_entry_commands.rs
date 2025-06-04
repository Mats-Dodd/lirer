use sea_orm::*;
use tauri::State;
use chrono::{DateTime as ChronoDateTime};
use crate::entities::{prelude::*, *};
use crate::models::{
    AppState, 
    CreateFeedEntryRequest, 
    UpdateFeedEntryRequest, 
    FeedEntryResponse,
    CreateFeedWithEntriesRequest,
    FeedWithEntriesResponse
};

// CREATE - Insert a new feed entry
#[tauri::command]
pub async fn create_feed_entry(
    state: State<'_, AppState>,
    request: CreateFeedEntryRequest,
) -> Result<FeedEntryResponse, String> {
    let db = &state.db;
    
    let now = chrono::Utc::now().naive_utc();
    
    // Parse published_at if provided
    let published_at = if let Some(published_str) = request.published_at {
        match ChronoDateTime::parse_from_rfc3339(&published_str) {
            Ok(dt) => Some(dt.naive_utc()),
            Err(_) => None, // If parsing fails, set to None
        }
    } else {
        None
    };
    
    let new_entry = feed_entry::ActiveModel {
        feed_id: ActiveValue::Set(request.feed_id),
        title: ActiveValue::Set(request.title),
        description: ActiveValue::Set(request.description),
        link: ActiveValue::Set(request.link),
        content: ActiveValue::Set(request.content),
        published_at: ActiveValue::Set(published_at),
        created_at: ActiveValue::Set(now),
        updated_at: ActiveValue::Set(now),
        is_read: ActiveValue::Set(false),
        is_starred: ActiveValue::Set(false),
        ..Default::default()
    };
    
    let result = FeedEntry::insert(new_entry)
        .exec(db)
        .await
        .map_err(|e| format!("Failed to create feed entry: {}", e))?;
    
    // Fetch the created entry to return it
    let created_entry = FeedEntry::find_by_id(result.last_insert_id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch created feed entry: {}", e))?
        .ok_or("Failed to find created feed entry")?;
    
    Ok(created_entry.into())
}

// CREATE - Create feed with entries (atomic operation)
#[tauri::command]
pub async fn create_feed_with_entries(
    state: State<'_, AppState>,
    request: CreateFeedWithEntriesRequest,
) -> Result<FeedWithEntriesResponse, String> {
    let db = &state.db;
    
    // Start a transaction
    let txn = db.begin().await.map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    let now = chrono::Utc::now().naive_utc();
    
    // Create the feed first
    let new_feed = feed::ActiveModel {
        url: ActiveValue::Set(request.url),
        title: ActiveValue::Set(request.title),
        description: ActiveValue::Set(request.description),
        created_at: ActiveValue::Set(now),
        updated_at: ActiveValue::Set(now),
        last_fetched_at: ActiveValue::Set(Some(now)),
        ..Default::default()
    };
    
    let feed_result = Feed::insert(new_feed)
        .exec(&txn)
        .await
        .map_err(|e| {
            format!("Failed to create feed: {}", e)
        })?;
    
    let feed_id = feed_result.last_insert_id;
    
    // Create all entries
    let mut created_entries = Vec::new();
    
    for entry_request in request.entries {
        let published_at = if let Some(published_str) = entry_request.published_at {
            match ChronoDateTime::parse_from_rfc3339(&published_str) {
                Ok(dt) => Some(dt.naive_utc()),
                Err(_) => None,
            }
        } else {
            None
        };
        
        let new_entry = feed_entry::ActiveModel {
            feed_id: ActiveValue::Set(feed_id),
            title: ActiveValue::Set(entry_request.title),
            description: ActiveValue::Set(entry_request.description),
            link: ActiveValue::Set(entry_request.link),
            content: ActiveValue::Set(entry_request.content),
            published_at: ActiveValue::Set(published_at),
            created_at: ActiveValue::Set(now),
            updated_at: ActiveValue::Set(now),
            is_read: ActiveValue::Set(false),
            is_starred: ActiveValue::Set(false),
            ..Default::default()
        };
        
        let entry_result = FeedEntry::insert(new_entry)
            .exec(&txn)
            .await
            .map_err(|e| format!("Failed to create feed entry: {}", e))?;
        
        let created_entry = FeedEntry::find_by_id(entry_result.last_insert_id)
            .one(&txn)
            .await
            .map_err(|e| format!("Failed to fetch created feed entry: {}", e))?
            .ok_or("Failed to find created feed entry")?;
        
        created_entries.push(created_entry.into());
    }
    
    // Commit the transaction
    txn.commit().await.map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    // Fetch the created feed
    let created_feed = Feed::find_by_id(feed_id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch created feed: {}", e))?
        .ok_or("Failed to find created feed")?;
    
    Ok(FeedWithEntriesResponse {
        id: created_feed.id,
        url: created_feed.url,
        title: created_feed.title,
        description: created_feed.description,
        created_at: created_feed.created_at.to_string(),
        updated_at: created_feed.updated_at.to_string(),
        last_fetched_at: created_feed.last_fetched_at.map(|dt| dt.to_string()),
        entries: created_entries,
    })
}

// READ - Get all entries for a feed
#[tauri::command]
pub async fn get_feed_entries(
    state: State<'_, AppState>,
    feed_id: i32,
) -> Result<Vec<FeedEntryResponse>, String> {
    let db = &state.db;
    
    let entries = FeedEntry::find()
        .filter(feed_entry::Column::FeedId.eq(feed_id))
        .order_by_desc(feed_entry::Column::PublishedAt)
        .all(db)
        .await
        .map_err(|e| format!("Failed to fetch feed entries: {}", e))?;
    
    Ok(entries.into_iter().map(|entry| entry.into()).collect())
}

// READ - Get entry by ID
#[tauri::command]
pub async fn get_feed_entry_by_id(
    state: State<'_, AppState>,
    id: i32,
) -> Result<Option<FeedEntryResponse>, String> {
    let db = &state.db;
    
    let entry = FeedEntry::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch feed entry: {}", e))?;
    
    Ok(entry.map(|e| e.into()))
}

// UPDATE - Update feed entry
#[tauri::command]
pub async fn update_feed_entry(
    state: State<'_, AppState>,
    request: UpdateFeedEntryRequest,
) -> Result<FeedEntryResponse, String> {
    let db = &state.db;
    
    let existing_entry = FeedEntry::find_by_id(request.id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch feed entry: {}", e))?
        .ok_or("Feed entry not found")?;
    
    let mut updated_entry: feed_entry::ActiveModel = existing_entry.into();
    
    // Update fields if provided
    if let Some(title) = request.title {
        updated_entry.title = ActiveValue::Set(title);
    }
    if let Some(description) = request.description {
        updated_entry.description = ActiveValue::Set(Some(description));
    }
    if let Some(content) = request.content {
        updated_entry.content = ActiveValue::Set(Some(content));
    }
    if let Some(is_read) = request.is_read {
        updated_entry.is_read = ActiveValue::Set(is_read);
    }
    if let Some(is_starred) = request.is_starred {
        updated_entry.is_starred = ActiveValue::Set(is_starred);
    }
    
    // Always update the updated_at timestamp
    updated_entry.updated_at = ActiveValue::Set(chrono::Utc::now().naive_utc());
    
    let result = updated_entry
        .update(db)
        .await
        .map_err(|e| format!("Failed to update feed entry: {}", e))?;
    
    Ok(result.into())
}

// DELETE - Delete feed entry
#[tauri::command]
pub async fn delete_feed_entry(
    state: State<'_, AppState>,
    id: i32,
) -> Result<String, String> {
    let db = &state.db;
    
    let existing_entry = FeedEntry::find_by_id(id)
        .one(db)
        .await
        .map_err(|e| format!("Failed to fetch feed entry: {}", e))?
        .ok_or("Feed entry not found")?;
    
    let delete_model = feed_entry::ActiveModel {
        id: ActiveValue::Set(existing_entry.id),
        ..Default::default()
    };
    
    delete_model
        .delete(db)
        .await
        .map_err(|e| format!("Failed to delete feed entry: {}", e))?;
    
    Ok(format!("Feed entry with ID {} deleted successfully", id))
}

// UTILITY - Mark entry as read/unread
#[tauri::command]
pub async fn mark_entry_as_read(
    state: State<'_, AppState>,
    id: i32,
    is_read: bool,
) -> Result<FeedEntryResponse, String> {
    let request = UpdateFeedEntryRequest {
        id,
        title: None,
        description: None,
        content: None,
        is_read: Some(is_read),
        is_starred: None,
    };
    
    update_feed_entry(state, request).await
}

// UTILITY - Star/unstar entry
#[tauri::command]
pub async fn mark_entry_as_starred(
    state: State<'_, AppState>,
    id: i32,
    is_starred: bool,
) -> Result<FeedEntryResponse, String> {
    let request = UpdateFeedEntryRequest {
        id,
        title: None,
        description: None,
        content: None,
        is_read: None,
        is_starred: Some(is_starred),
    };
    
    update_feed_entry(state, request).await
} 