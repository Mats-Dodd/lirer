export interface CreateFeedRequest {
  url: string
  title?: string
  description?: string
}

export interface FeedResponse {
  id: number
  url: string
  title?: string
  description?: string
  created_at: string
  updated_at: string
  last_fetched_at?: string
}

export interface FeedFormData {
  url: string
}

export interface MessageState {
  text: string
  type: 'success' | 'error'
}

export interface ParsedEntry {
  title?: string
  description?: string
  link?: string
  published?: string
  content?: string
}

export interface ParsedFeed {
  title: string
  description?: string
  url?: string
  entries: ParsedEntry[]
}

// Feed Entry Types
export interface FeedEntryResponse {
  id: number
  feed_id: number
  title: string
  description?: string
  link: string
  content?: string
  published_at?: string
  created_at: string
  updated_at: string
  is_read: boolean
  is_starred: boolean
}

export interface CreateFeedEntryRequest {
  feed_id: number
  title: string
  description?: string
  link: string
  content?: string
  published_at?: string
}

export interface CreateFeedWithEntriesRequest {
  url: string
  title?: string
  description?: string
  entries: CreateFeedEntryRequest[]
}

export interface FeedWithEntriesResponse {
  id: number
  url: string
  title?: string
  description?: string
  created_at: string
  updated_at: string
  last_fetched_at?: string
  entries: FeedEntryResponse[]
}

export interface UpdateFeedEntryRequest {
  id: number
  title?: string
  description?: string
  content?: string
  is_read?: boolean
  is_starred?: boolean
}

// Refresh System Types
export interface RefreshResponse {
  total_feeds: number
  message: string
  estimated_completion_time?: number
}

export interface RefreshProgress {
  total_feeds: number
  completed_feeds: number
  failed_feeds: number
  current_feed_url?: string
  is_refreshing: boolean
  errors: RefreshError[]
}

export interface RefreshError {
  feed_id: number
  feed_url: string
  error_message: string
  error_type: 'network' | 'parse' | 'timeout' | 'unknown'
}

export interface RefreshSummary {
  timestamp: string
  total_processed: number
  successful_count: number
  failed_count: number
  duration_ms: number
  error_details: RefreshError[]
} 