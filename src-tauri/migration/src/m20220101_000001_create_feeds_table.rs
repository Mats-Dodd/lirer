// m20220101_000001_create_feeds_table.rs

use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20220101_000001_create_feeds_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    // Define how to apply this migration: Create the Feeds table.
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Feed::Table)
                    .col(
                        ColumnDef::new(Feed::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Feed::Url)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Feed::Title).string())
                    .col(ColumnDef::new(Feed::Description).text())
                    .col(
                        ColumnDef::new(Feed::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Feed::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Feed::LastFetchedAt).timestamp())
                    .to_owned(),
            )
            .await
    }

    // Define how to rollback this migration: Drop the Feeds table.
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Feed::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum Feed {
    Table,
    Id,
    Url,
    Title,
    Description,
    CreatedAt,
    UpdatedAt,
    LastFetchedAt,
}
