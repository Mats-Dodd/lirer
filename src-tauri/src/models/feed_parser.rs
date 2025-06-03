use feed_rs::parser;
use serde::{Deserialize, Serialize};
use tauri_plugin_http::reqwest;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedFeed {
    pub title: String,
    pub description: Option<String>,
    pub url: Option<String>,
    pub entries: Vec<ParsedEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedEntry {
    pub title: Option<String>,
    pub description: Option<String>,
    pub link: Option<String>,
    pub published: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Serialize)]
pub enum FeedParseError {
    NetworkError(String),
    ParseError(String),
}

impl std::fmt::Display for FeedParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FeedParseError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            FeedParseError::ParseError(msg) => write!(f, "Parse error: {}", msg),
        }
    }
}

impl std::error::Error for FeedParseError {}

pub async fn fetch_and_parse_feed(url: &str) -> Result<ParsedFeed, FeedParseError> {
    println!("🌐 Fetching feed from: {}", url);
    
    // Use tauri_plugin_http::reqwest as specified by the user
    let res = reqwest::get(url).await
        .map_err(|e| FeedParseError::NetworkError(e.to_string()))?;
    
    println!("{:?}", res.status()); // e.g. 200
    
    if !res.status().is_success() {
        return Err(FeedParseError::NetworkError(format!(
            "HTTP error: {}",
            res.status()
        )));
    }
    
    let content = res.text().await
        .map_err(|e| FeedParseError::NetworkError(e.to_string()))?;
    
    println!("{:?}", content.len()); // Content length
    
    parse_feed_content(&content)
}

pub fn parse_feed_content(content: &str) -> Result<ParsedFeed, FeedParseError> {
    println!("🔍 Parsing feed content...");
    
    let feed = parser::parse(content.as_bytes())
        .map_err(|e| FeedParseError::ParseError(e.to_string()))?;
    
    let parsed_entries: Vec<ParsedEntry> = feed.entries.into_iter().map(|entry| {
        ParsedEntry {
            title: entry.title.map(|t| t.content),
            description: entry.summary.map(|s| s.content),
            link: entry.links.first().map(|l| l.href.clone()),
            published: entry.published.map(|p| p.to_rfc3339()),
            content: entry.content.and_then(|c| c.body),
        }
    }).collect();
    
    let parsed_feed = ParsedFeed {
        title: feed.title.map(|t| t.content).unwrap_or_else(|| "Untitled Feed".to_string()),
        description: feed.description.map(|d| d.content),
        url: feed.links.first().map(|l| l.href.clone()),
        entries: parsed_entries,
    };
    
    println!("✅ Successfully parsed feed: '{}'", parsed_feed.title);
    println!("📰 Found {} entries", parsed_feed.entries.len());
    
    Ok(parsed_feed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_rss_sample() {
        let rss_content = r#"<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
            <channel>
                <title>Test RSS Feed</title>
                <description>A test RSS feed</description>
                <link>https://example.com</link>
                <item>
                    <title>Test Article</title>
                    <description>This is a test article</description>
                    <link>https://example.com/article1</link>
                    <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
                </item>
            </channel>
        </rss>"#;

        let result = parse_feed_content(rss_content);
        assert!(result.is_ok());
        
        let feed = result.unwrap();
        assert_eq!(feed.title, "Test RSS Feed");
        assert_eq!(feed.entries.len(), 1);
        assert_eq!(feed.entries[0].title, Some("Test Article".to_string()));
    }

    #[test]
    fn test_parse_atom_sample() {
        let atom_content = r#"<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
            <title>Test Atom Feed</title>
            <subtitle>A test Atom feed</subtitle>
            <link href="https://example.com"/>
            <entry>
                <title>Test Entry</title>
                <summary>This is a test entry</summary>
                <link href="https://example.com/entry1"/>
                <id>entry1</id>
                <published>2024-01-01T12:00:00Z</published>
            </entry>
        </feed>"#;

        let result = parse_feed_content(atom_content);
        assert!(result.is_ok());
        
        let feed = result.unwrap();
        assert_eq!(feed.title, "Test Atom Feed");
        assert_eq!(feed.entries.len(), 1);
        assert_eq!(feed.entries[0].title, Some("Test Entry".to_string()));
    }
} 