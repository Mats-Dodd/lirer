use sea_orm::*;
use std::env;

mod entities;
mod models;
mod commands;

use models::AppState;
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
