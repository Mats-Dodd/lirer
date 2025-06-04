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