use sea_orm::*;
use std::env;
use std::sync::Arc;

mod entities;
mod models;
mod commands;

use models::{AppState, AsyncFeedFetcher, FetcherConfig};
use commands::*;

async fn setup_database() -> Result<DatabaseConnection, DbErr> {
    dotenv::dotenv().ok();
    
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in environment variables or .env file");
    
    let db = Database::connect(&database_url).await?;
    Ok(db)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::block_on(async {
        let db = setup_database().await.expect("Failed to setup database");
        
        // Initialize async feed fetcher with database connection for automatic integration
        let fetcher_config = FetcherConfig::default();
        let db_arc = Arc::new(db.clone());
        let async_fetcher = AsyncFeedFetcher::new_with_db(fetcher_config, Some(db_arc));
        
        let app_state = AppState { 
            db,
            async_fetcher: Some(async_fetcher),
        };

        tauri::Builder::default()
            .manage(app_state)
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_http::init())
            .invoke_handler(tauri::generate_handler![
                greet,
                create_feed,
                get_all_feeds,
                get_feed_by_id,
                get_feed_by_url,
                update_feed,
                update_feed_last_fetched,
                delete_feed,
                fetch_and_parse_feed_command,
                parse_feed_content_command,
                start_async_fetcher,
                stop_async_fetcher,
                get_async_fetcher_status,
                queue_feed_for_async_fetch,
                get_async_fetch_results,
                fetch_multiple_feeds_async,
                // Refresh commands
                refresh_all_feeds,
                refresh_single_feed,
                get_refresh_progress,
                get_last_refresh_summary,
                // Feed Entry commands
                create_feed_entry,
                create_feed_with_entries,
                get_feed_entries,
                get_feed_entry_by_id,
                update_feed_entry,
                delete_feed_entry,
                mark_entry_as_read,
                mark_entry_as_starred
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}
