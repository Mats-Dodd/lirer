// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// main.rs

use futures::executor::block_on;
use sea_orm::{Database, DbErr};
use std::env;

async fn run() -> Result<(), DbErr> {
    // Load environment variables from .env file
    dotenv::dotenv().ok();
    
    // Read DATABASE_URL from environment variables
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in environment variables or .env file");
    
    let db = Database::connect(&database_url).await?;

    Ok(())
}

fn main() {
    if let Err(err) = block_on(run()) {
        panic!("{}", err);
    }
    reader_lib::run()
}
