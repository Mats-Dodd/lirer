pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_feeds_table;
mod m20240101_000002_create_feed_entries_table;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_feeds_table::Migration),
            Box::new(m20240101_000002_create_feed_entries_table::Migration),
        ]
    }
}
