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