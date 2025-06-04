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
  success: boolean
  message: string
  total_feeds: number
  estimated_completion_time?: number // seconds
}

export interface RefreshProgress {
  is_active: boolean
  total_feeds: number
  completed_feeds: number
  failed_feeds: number
  current_feed_url?: string
  progress_percentage: number
  estimated_time_remaining?: number // seconds
  errors: RefreshError[]
}

export interface RefreshError {
  feed_url: string
  feed_title?: string
  error_message: string
  error_type: string // "network", "parse", "timeout", "rate_limited", "too_many_retries", "database"
  retry_count: number
  timestamp: string
}

export interface RefreshSummary {
  timestamp: string
  total_processed: number
  successful_count: number
  failed_count: number
  duration_seconds: number
  feeds_updated: FeedRefreshStatus[]
  errors: RefreshError[]
}

export interface FeedRefreshStatus {
  feed_id: number
  feed_url: string
  feed_title?: string
  status: string // "success", "failed", "skipped"
  entries_added: number
  last_fetched_at: string
  error?: RefreshError
}

// Periodic Refresh Settings Types
export interface PeriodicRefreshSettings {
  enabled: boolean
  interval: RefreshInterval
  quietHours: QuietHours
  bandwidthAware: boolean
  pauseOnUserActivity: boolean
  enableDesktopNotifications: boolean
  lastAutoRefresh?: string
}

export interface RefreshInterval {
  value: number // in minutes
  label: string
}

export interface QuietHours {
  enabled: boolean
  startHour: number // 0-23
  endHour: number // 0-23
}

export interface AppSettings {
  periodicRefresh: PeriodicRefreshSettings
  general: GeneralSettings
}

export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system'
  compactView: boolean
  markAsReadOnScroll: boolean
}

// Background Refresh Status Types
export interface BackgroundRefreshStatus {
  isScheduled: boolean
  nextRefreshTime: string | null
  lastRefreshTime: string | null
  isUserActive: boolean
  isQuietHours: boolean
  connectionSpeed?: 'slow' | 'moderate' | 'fast'
}

// Default settings
export const DEFAULT_REFRESH_INTERVALS: RefreshInterval[] = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
]

export const DEFAULT_PERIODIC_REFRESH_SETTINGS: PeriodicRefreshSettings = {
  enabled: false,
  interval: DEFAULT_REFRESH_INTERVALS[2], // 1 hour default
  quietHours: {
    enabled: false,
    startHour: 23, // 11 PM
    endHour: 7, // 7 AM
  },
  bandwidthAware: true,
  pauseOnUserActivity: true,
  enableDesktopNotifications: false,
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  periodicRefresh: DEFAULT_PERIODIC_REFRESH_SETTINGS,
  general: {
    theme: 'system',
    compactView: false,
    markAsReadOnScroll: false,
  },
} 