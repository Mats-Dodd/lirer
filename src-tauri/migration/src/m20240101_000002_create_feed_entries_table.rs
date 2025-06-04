use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20240101_000002_create_feed_entries_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    // Define how to apply this migration: Create the FeedEntries table.
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create the table first
        manager
            .create_table(
                Table::create()
                    .table(FeedEntry::Table)
                    .col(
                        ColumnDef::new(FeedEntry::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(FeedEntry::FeedId)
                            .integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(FeedEntry::Title).string().not_null())
                    .col(ColumnDef::new(FeedEntry::Description).text())
                    .col(
                        ColumnDef::new(FeedEntry::Link)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(FeedEntry::Content).text())
                    .col(ColumnDef::new(FeedEntry::PublishedAt).timestamp())
                    .col(
                        ColumnDef::new(FeedEntry::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(FeedEntry::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(FeedEntry::IsRead)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(FeedEntry::IsStarred)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .to_owned(),
            )
            .await?;

        // Add unique constraint for link
        manager
            .create_index(
                Index::create()
                    .name("idx_feed_entries_link_unique")
                    .table(FeedEntry::Table)
                    .col(FeedEntry::Link)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Add foreign key constraint
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_feed_entry_feed_id")
                    .from(FeedEntry::Table, FeedEntry::FeedId)
                    .to(Feed::Table, Feed::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .on_update(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Add indexes for better query performance
        manager
            .create_index(
                Index::create()
                    .name("idx_feed_entries_feed_id")
                    .table(FeedEntry::Table)
                    .col(FeedEntry::FeedId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_feed_entries_published_at")
                    .table(FeedEntry::Table)
                    .col(FeedEntry::PublishedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    // Define how to rollback this migration: Drop the FeedEntries table.
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(FeedEntry::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum FeedEntry {
    Table,
    Id,
    FeedId,
    Title,
    Description,
    Link,
    Content,
    PublishedAt,
    CreatedAt,
    UpdatedAt,
    IsRead,
    IsStarred,
}

// Reference to the Feed table from the previous migration
#[derive(Iden)]
pub enum Feed {
    Table,
    Id,
} 