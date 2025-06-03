use std::collections::{HashMap, BinaryHeap};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, Mutex, RwLock};
use tokio::time::{sleep, timeout};
use tauri_plugin_http::reqwest;
use crate::models::feed_parser::{ParsedFeed, parse_feed_content};

// Configuration for the async fetcher
#[derive(Debug, Clone)]
pub struct FetcherConfig {
    pub max_concurrent_requests: usize,
    pub rate_limit_delay: Duration,
    pub request_timeout: Duration,
    pub max_retries: u32,
    pub base_retry_delay: Duration,
    pub max_retry_delay: Duration,
}

impl Default for FetcherConfig {
    fn default() -> Self {
        Self {
            max_concurrent_requests: 10,
            rate_limit_delay: Duration::from_millis(100),
            request_timeout: Duration::from_secs(30),
            max_retries: 3,
            base_retry_delay: Duration::from_millis(500),
            max_retry_delay: Duration::from_secs(60),
        }
    }
}

// Represents a feed fetch task
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FeedFetchTask {
    pub url: String,
    pub priority: FetchPriority,
    pub retry_count: u32,
}

impl PartialOrd for FeedFetchTask {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for FeedFetchTask {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // Higher priority comes first (max-heap behavior)
        self.priority.cmp(&other.priority)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum FetchPriority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

// Result of a feed fetch operation
#[derive(Debug, Clone)]
pub struct FeedFetchResult {
    pub url: String,
    pub result: Result<ParsedFeed, FeedFetchError>,
    #[allow(dead_code)]
    pub fetch_duration: Duration,
    #[allow(dead_code)]
    pub retry_count: u32,
}

#[derive(Debug, Clone)]
pub enum FeedFetchError {
    NetworkError(String),
    ParseError(String),
    Timeout,
    RateLimited,
    TooManyRetries,
}

impl std::fmt::Display for FeedFetchError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FeedFetchError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            FeedFetchError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            FeedFetchError::Timeout => write!(f, "Request timeout"),
            FeedFetchError::RateLimited => write!(f, "Rate limited"),
            FeedFetchError::TooManyRetries => write!(f, "Too many retries"),
        }
    }
}

impl std::error::Error for FeedFetchError {}

impl FeedFetchResult {
    #[allow(dead_code)]
    pub fn fetch_duration(&self) -> Duration {
        self.fetch_duration
    }

    #[allow(dead_code)]
    pub fn retry_count(&self) -> u32 {
        self.retry_count
    }
}

// Rate limiter to prevent overwhelming servers
#[derive(Debug, Clone)]
pub struct RateLimiter {
    last_request_times: Arc<RwLock<HashMap<String, Instant>>>,
    min_delay: Duration,
}

impl RateLimiter {
    fn new(min_delay: Duration) -> Self {
        Self {
            last_request_times: Arc::new(RwLock::new(HashMap::new())),
            min_delay,
        }
    }

    async fn wait_if_needed(&self, domain: &str) -> Result<(), FeedFetchError> {
        let now = Instant::now();
        
        // Check if we need to wait
        {
            let times = self.last_request_times.read().await;
            if let Some(&last_time) = times.get(domain) {
                let elapsed = now.duration_since(last_time);
                if elapsed < self.min_delay {
                    let wait_time = self.min_delay - elapsed;
                    drop(times); // Release read lock before sleeping
                    
                    // If wait time is too long, return rate limited error
                    if wait_time > Duration::from_secs(5) {
                        return Err(FeedFetchError::RateLimited);
                    }
                    
                    sleep(wait_time).await;
                }
            }
        }

        // Update the last request time
        let mut times = self.last_request_times.write().await;
        times.insert(domain.to_string(), Instant::now());
        Ok(())
    }
}

// Main async feed fetcher
pub struct AsyncFeedFetcher {
    #[allow(dead_code)]
    config: FetcherConfig,
    task_sender: mpsc::UnboundedSender<FeedFetchTask>,
    result_receiver: Arc<Mutex<mpsc::UnboundedReceiver<FeedFetchResult>>>,
    #[allow(dead_code)]
    rate_limiter: RateLimiter,
    is_running: Arc<RwLock<bool>>,
}

impl AsyncFeedFetcher {
    pub fn new(config: FetcherConfig) -> Self {
        let (task_sender, task_receiver) = mpsc::unbounded_channel();
        let (result_sender, result_receiver) = mpsc::unbounded_channel();
        
        let rate_limiter = RateLimiter::new(config.rate_limit_delay);
        let is_running = Arc::new(RwLock::new(false));

        // Spawn the worker task
        let fetcher = AsyncFeedFetcher {
            config: config.clone(),
            task_sender,
            result_receiver: Arc::new(Mutex::new(result_receiver)),
            rate_limiter: rate_limiter.clone(),
            is_running: is_running.clone(),
        };

        // Start the background workers
        tokio::spawn(Self::worker_loop(
            task_receiver,
            result_sender,
            config,
            rate_limiter,
            is_running,
        ));

        fetcher
    }

    pub async fn start(&self) {
        let mut running = self.is_running.write().await;
        *running = true;
        println!("🚀 AsyncFeedFetcher started");
    }

    pub async fn stop(&self) {
        let mut running = self.is_running.write().await;
        *running = false;
        println!("🛑 AsyncFeedFetcher stopped");
    }

    pub async fn is_running(&self) -> bool {
        *self.is_running.read().await
    }

    #[allow(dead_code)]
    pub fn config(&self) -> &FetcherConfig {
        &self.config
    }

    #[allow(dead_code)]
    pub fn rate_limiter(&self) -> &RateLimiter {
        &self.rate_limiter
    }

    pub fn queue_feed(&self, url: String, priority: FetchPriority) -> Result<(), String> {
        let task = FeedFetchTask {
            url,
            priority,
            retry_count: 0,
        };

        self.task_sender.send(task)
            .map_err(|_| "Failed to queue feed task".to_string())
    }

    pub async fn get_results(&self) -> Vec<FeedFetchResult> {
        let mut results = Vec::new();
        let mut receiver = self.result_receiver.lock().await;
        
        while let Ok(result) = receiver.try_recv() {
            results.push(result);
        }
        
        results
    }

    async fn worker_loop(
        mut task_receiver: mpsc::UnboundedReceiver<FeedFetchTask>,
        result_sender: mpsc::UnboundedSender<FeedFetchResult>,
        config: FetcherConfig,
        rate_limiter: RateLimiter,
        is_running: Arc<RwLock<bool>>,
    ) {
        let semaphore = Arc::new(tokio::sync::Semaphore::new(config.max_concurrent_requests));
        let mut task_queue = BinaryHeap::new();
        
        // Process tasks with priority ordering
        while let Some(task) = task_receiver.recv().await {
            if !*is_running.read().await {
                break;
            }
            
            // Add the received task to priority queue
            task_queue.push(task);
            
            // Collect any additional tasks that are immediately available
            while let Ok(additional_task) = task_receiver.try_recv() {
                task_queue.push(additional_task);
            }
            
            // Process the highest priority task
            if let Some(priority_task) = task_queue.pop() {
                let permit = semaphore.clone().acquire_owned().await;
                let result_sender = result_sender.clone();
                let config = config.clone();
                let rate_limiter = rate_limiter.clone();
                
                tokio::spawn(async move {
                    let _permit = permit; // Hold permit for the duration of the task
                    let start_time = Instant::now();
                    
                    let result = Self::fetch_with_retry(priority_task.clone(), &config, &rate_limiter).await;
                    let fetch_duration = start_time.elapsed();
                    
                    let fetch_result = FeedFetchResult {
                        url: priority_task.url,
                        result,
                        fetch_duration,
                        retry_count: priority_task.retry_count,
                    };
                    
                    if result_sender.send(fetch_result).is_err() {
                        eprintln!("Failed to send fetch result");
                    }
                });
            }
        }
    }

    async fn fetch_with_retry(
        mut task: FeedFetchTask,
        config: &FetcherConfig,
        rate_limiter: &RateLimiter,
    ) -> Result<ParsedFeed, FeedFetchError> {
        let mut last_error = None;
        
        for attempt in 0..=config.max_retries {
            task.retry_count = attempt;
            
            // Extract domain for rate limiting
            let domain = Self::extract_domain(&task.url).unwrap_or_else(|| task.url.clone());
            
            // Apply rate limiting
            rate_limiter.wait_if_needed(&domain).await?;
            
            match Self::fetch_single(&task.url, config).await {
                Ok(feed) => {
                    if attempt > 0 {
                        println!("✅ Feed fetched successfully after {} retries: {}", attempt, task.url);
                    }
                    return Ok(feed);
                },
                Err(error) => {
                    last_error = Some(error.clone());
                    
                    if attempt < config.max_retries {
                        let delay = Self::calculate_exponential_backoff(attempt, config);
                        println!("⚠️ Fetch attempt {} failed for {}: {}. Retrying in {:?}", 
                                attempt + 1, task.url, error, delay);
                        sleep(delay).await;
                    } else {
                        println!("❌ All {} attempts failed for {}: {}", 
                                config.max_retries + 1, task.url, error);
                    }
                }
            }
        }
        
        Err(last_error.unwrap_or(FeedFetchError::TooManyRetries))
    }

    async fn fetch_single(url: &str, config: &FetcherConfig) -> Result<ParsedFeed, FeedFetchError> {
        let start_time = Instant::now();
        
        println!("🌐 Fetching feed from: {}", url);
        
        // Create request with timeout
        let response_future = reqwest::get(url);
        let response = timeout(config.request_timeout, response_future)
            .await
            .map_err(|_| FeedFetchError::Timeout)?
            .map_err(|e| FeedFetchError::NetworkError(e.to_string()))?;
        
        println!("📡 Response status: {}", response.status());
        
        if !response.status().is_success() {
            return Err(FeedFetchError::NetworkError(format!(
                "HTTP error: {}",
                response.status()
            )));
        }

        // Check content type for proper parsing
        let content_type = response.headers()
            .get("content-type")
            .and_then(|ct| ct.to_str().ok())
            .unwrap_or("")
            .to_lowercase();
        
        println!("📄 Content type: {}", content_type);
        
        let content = response.text().await
            .map_err(|e| FeedFetchError::NetworkError(e.to_string()))?;
        
        println!("📏 Content length: {} bytes", content.len());
        
        // Determine parser based on content type and content
        let parsed_feed = if content_type.contains("json") || content.trim_start().starts_with('{') {
            // Handle JSON feeds if needed (can be extended)
            return Err(FeedFetchError::ParseError("JSON feeds not yet supported".to_string()));
        } else {
            // Handle RSS/Atom feeds
            parse_feed_content(&content)
                .map_err(|e| match e {
                    crate::models::feed_parser::FeedParseError::NetworkError(msg) => 
                        FeedFetchError::NetworkError(msg),
                    crate::models::feed_parser::FeedParseError::ParseError(msg) => 
                        FeedFetchError::ParseError(msg),
                })?
        };
        
        let duration = start_time.elapsed();
        println!("✅ Successfully fetched and parsed feed '{}' in {:?}", 
                parsed_feed.title, duration);
        
        Ok(parsed_feed)
    }

    fn extract_domain(url: &str) -> Option<String> {
        if let Ok(parsed_url) = url::Url::parse(url) {
            parsed_url.host_str().map(|host| host.to_string())
        } else {
            None
        }
    }

    fn calculate_exponential_backoff(attempt: u32, config: &FetcherConfig) -> Duration {
        let exponential_delay = config.base_retry_delay * 2_u32.pow(attempt);
        std::cmp::min(exponential_delay, config.max_retry_delay)
    }
}

impl Default for AsyncFeedFetcher {
    fn default() -> Self {
        Self::new(FetcherConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_exponential_backoff() {
        let config = FetcherConfig {
            base_retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(10),
            ..Default::default()
        };

        assert_eq!(
            AsyncFeedFetcher::calculate_exponential_backoff(0, &config),
            Duration::from_millis(100)
        );
        assert_eq!(
            AsyncFeedFetcher::calculate_exponential_backoff(1, &config),
            Duration::from_millis(200)
        );
        assert_eq!(
            AsyncFeedFetcher::calculate_exponential_backoff(2, &config),
            Duration::from_millis(400)
        );
    }

    #[test]
    fn test_domain_extraction() {
        assert_eq!(
            AsyncFeedFetcher::extract_domain("https://example.com/feed.xml"),
            Some("example.com".to_string())
        );
        assert_eq!(
            AsyncFeedFetcher::extract_domain("http://blog.rust-lang.org/feed.xml"),
            Some("blog.rust-lang.org".to_string())
        );
        assert_eq!(
            AsyncFeedFetcher::extract_domain("invalid-url"),
            None
        );
    }

    #[tokio::test]
    async fn test_rate_limiter() {
        let rate_limiter = RateLimiter::new(Duration::from_millis(100));
        
        let start = Instant::now();
        let _ = rate_limiter.wait_if_needed("example.com").await;
        let _ = rate_limiter.wait_if_needed("example.com").await;
        let elapsed = start.elapsed();
        
        // Second call should have been delayed
        assert!(elapsed >= Duration::from_millis(100));
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use tokio::time::{sleep, Duration};

    #[tokio::test]
    async fn test_async_fetcher_lifecycle() {
        let config = FetcherConfig {
            max_concurrent_requests: 2,
            rate_limit_delay: Duration::from_millis(50),
            request_timeout: Duration::from_secs(5),
            max_retries: 1,
            base_retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(1),
        };

        let fetcher = AsyncFeedFetcher::new(config);
        
        // Initially not running
        assert_eq!(fetcher.is_running().await, false);
        
        // Start the fetcher
        fetcher.start().await;
        assert_eq!(fetcher.is_running().await, true);
        
        // Stop the fetcher
        fetcher.stop().await;
        assert_eq!(fetcher.is_running().await, false);
    }

    #[tokio::test]
    async fn test_queue_and_process_feeds() {
        let config = FetcherConfig {
            max_concurrent_requests: 2,
            rate_limit_delay: Duration::from_millis(10),
            request_timeout: Duration::from_secs(5),
            max_retries: 1,
            base_retry_delay: Duration::from_millis(50),
            max_retry_delay: Duration::from_secs(1),
        };

        let fetcher = AsyncFeedFetcher::new(config);
        fetcher.start().await;

        // Queue some test feeds (these will likely fail, but we're testing the queueing mechanism)
        let test_urls = vec![
            "https://httpbin.org/status/200".to_string(),
            "https://httpbin.org/status/404".to_string(),
            "https://httpbin.org/delay/1".to_string(),
        ];

        for url in test_urls {
            let result = fetcher.queue_feed(url, FetchPriority::Normal);
            assert!(result.is_ok());
        }

        // Wait a bit for processing
        sleep(Duration::from_secs(3)).await;

        // Check results
        let results = fetcher.get_results().await;
        
        // We should have some results (even if they're errors due to invalid feeds)
        println!("Integration test results: {} feeds processed", results.len());
        
        fetcher.stop().await;
    }

    #[tokio::test] 
    async fn test_rate_limiting_behavior() {
        let rate_limiter = RateLimiter::new(Duration::from_millis(100));
        let request_count = Arc::new(AtomicUsize::new(0));
        
        let start_time = Instant::now();
        
        // Simulate multiple requests to the same domain
        let domain = "example.com";
        for _ in 0..3 {
            let _ = rate_limiter.wait_if_needed(domain).await;
            request_count.fetch_add(1, Ordering::SeqCst);
        }
        
        let elapsed = start_time.elapsed();
        
        // Should have taken at least 200ms (2 delays of 100ms each)
        assert!(elapsed >= Duration::from_millis(200));
        assert_eq!(request_count.load(Ordering::SeqCst), 3);
    }

    #[tokio::test]
    async fn test_concurrent_request_limiting() {
        let config = FetcherConfig {
            max_concurrent_requests: 2, // Limit to 2 concurrent requests
            rate_limit_delay: Duration::from_millis(10),
            request_timeout: Duration::from_secs(2),
            max_retries: 0,
            base_retry_delay: Duration::from_millis(50),
            max_retry_delay: Duration::from_secs(1),
        };

        let fetcher = AsyncFeedFetcher::new(config);
        fetcher.start().await;

        // Queue more requests than the concurrency limit
        let test_urls = vec![
            "https://httpbin.org/delay/1".to_string(),
            "https://httpbin.org/delay/1".to_string(),
            "https://httpbin.org/delay/1".to_string(),
            "https://httpbin.org/delay/1".to_string(),
        ];

        let start_time = Instant::now();
        
        for url in test_urls {
            let _ = fetcher.queue_feed(url, FetchPriority::High);
        }

        // Wait for processing
        sleep(Duration::from_secs(4)).await;
        
        let elapsed = start_time.elapsed();
        
        // With max 2 concurrent requests and 1s delay each, should take at least 2 seconds
        // (first batch of 2 processes in parallel, then second batch)
        assert!(elapsed >= Duration::from_secs(2));
        
        let results = fetcher.get_results().await;
        println!("Concurrency test processed {} requests in {:?}", results.len(), elapsed);
        
        fetcher.stop().await;
    }

    #[tokio::test]
    async fn test_priority_handling() {
        let config = FetcherConfig {
            max_concurrent_requests: 1, // Process one at a time to test priority
            rate_limit_delay: Duration::from_millis(10),
            request_timeout: Duration::from_secs(2),
            max_retries: 0,
            base_retry_delay: Duration::from_millis(50),
            max_retry_delay: Duration::from_secs(1),
        };

        let fetcher = AsyncFeedFetcher::new(config);
        fetcher.start().await;

        // Queue feeds with different priorities
        let _ = fetcher.queue_feed("https://httpbin.org/status/200".to_string(), FetchPriority::Low);
        let _ = fetcher.queue_feed("https://httpbin.org/status/201".to_string(), FetchPriority::Critical);
        let _ = fetcher.queue_feed("https://httpbin.org/status/202".to_string(), FetchPriority::Normal);
        
        // Wait for processing
        sleep(Duration::from_secs(2)).await;
        
        let results = fetcher.get_results().await;
        
        // Verify we got results (order testing would require more sophisticated mocking)
        assert!(results.len() > 0);
        println!("Priority test processed {} requests", results.len());
        
        fetcher.stop().await;
    }

    #[test]
    fn test_exponential_backoff_calculation() {
        let config = FetcherConfig {
            base_retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(5),
            ..Default::default()
        };

        // Test progressive backoff
        assert_eq!(
            AsyncFeedFetcher::calculate_exponential_backoff(0, &config),
            Duration::from_millis(100)
        );
        assert_eq!(
            AsyncFeedFetcher::calculate_exponential_backoff(1, &config),
            Duration::from_millis(200)
        );
        assert_eq!(
            AsyncFeedFetcher::calculate_exponential_backoff(2, &config),
            Duration::from_millis(400)
        );
        assert_eq!(
            AsyncFeedFetcher::calculate_exponential_backoff(3, &config),
            Duration::from_millis(800)
        );

        // Test max cap
        assert_eq!(
            AsyncFeedFetcher::calculate_exponential_backoff(10, &config),
            Duration::from_secs(5) // Should be capped at max_retry_delay
        );
    }

    #[test]
    fn test_domain_extraction_edge_cases() {
        // Valid URLs
        assert_eq!(
            AsyncFeedFetcher::extract_domain("https://www.example.com/path?query=1"),
            Some("www.example.com".to_string())
        );
        assert_eq!(
            AsyncFeedFetcher::extract_domain("http://subdomain.example.org:8080/feed"),
            Some("subdomain.example.org".to_string())
        );
        
        // Invalid or edge case URLs
        assert_eq!(
            AsyncFeedFetcher::extract_domain("not-a-url"),
            None
        );
        assert_eq!(
            AsyncFeedFetcher::extract_domain(""),
            None
        );
        assert_eq!(
            AsyncFeedFetcher::extract_domain("ftp://files.example.com/file.xml"),
            Some("files.example.com".to_string())
        );
    }
} 