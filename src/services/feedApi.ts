import { invoke } from "@tauri-apps/api/core"
import { 
  CreateFeedRequest, 
  FeedResponse, 
  ParsedFeed,
  CreateFeedWithEntriesRequest,
  FeedWithEntriesResponse,
  FeedEntryResponse,
  CreateFeedEntryRequest,
  UpdateFeedEntryRequest,
  RefreshResponse,
  RefreshProgress,
  RefreshSummary
} from "../types/feed"

export const feedApi = {
  // Feed operations
  async createFeed(request: CreateFeedRequest): Promise<FeedResponse> {
    return await invoke<FeedResponse>("create_feed", { request })
  },

  async createFeedWithEntries(request: CreateFeedWithEntriesRequest): Promise<FeedWithEntriesResponse> {
    return await invoke<FeedWithEntriesResponse>("create_feed_with_entries", { request })
  },

  async getAllFeeds(): Promise<FeedResponse[]> {
    return await invoke<FeedResponse[]>("get_all_feeds")
  },

  async deleteFeed(id: number): Promise<string> {
    return await invoke<string>("delete_feed", { id })
  },

  // Feed parsing operations
  async parseFeedFromUrl(url: string): Promise<ParsedFeed> {
    return await invoke<ParsedFeed>("fetch_and_parse_feed_command", { url })
  },

  async parseFeedContent(content: string): Promise<ParsedFeed> {
    return await invoke<ParsedFeed>("parse_feed_content_command", { content })
  },

  // Feed entry operations
  async createFeedEntry(request: CreateFeedEntryRequest): Promise<FeedEntryResponse> {
    return await invoke<FeedEntryResponse>("create_feed_entry", { request })
  },

  async getFeedEntries(feedId: number): Promise<FeedEntryResponse[]> {
    return await invoke<FeedEntryResponse[]>("get_feed_entries", { feedId })
  },

  async getFeedEntryById(id: number): Promise<FeedEntryResponse | null> {
    return await invoke<FeedEntryResponse | null>("get_feed_entry_by_id", { id })
  },

  async updateFeedEntry(request: UpdateFeedEntryRequest): Promise<FeedEntryResponse> {
    return await invoke<FeedEntryResponse>("update_feed_entry", { request })
  },

  async deleteFeedEntry(id: number): Promise<string> {
    return await invoke<string>("delete_feed_entry", { id })
  },

  async markEntryAsRead(id: number, isRead: boolean): Promise<FeedEntryResponse> {
    return await invoke<FeedEntryResponse>("mark_entry_as_read", { id, isRead })
  },

  async markEntryAsStarred(id: number, isStarred: boolean): Promise<FeedEntryResponse> {
    return await invoke<FeedEntryResponse>("mark_entry_as_starred", { id, isStarred })
  },

  // Refresh operations
  async refreshAllFeeds(): Promise<RefreshResponse> {
    return await invoke<RefreshResponse>("refresh_all_feeds")
  },

  async refreshSingleFeed(feedId: number): Promise<RefreshResponse> {
    return await invoke<RefreshResponse>("refresh_single_feed", { feedId })
  },

  async getRefreshProgress(): Promise<RefreshProgress> {
    return await invoke<RefreshProgress>("get_refresh_progress")
  },

  async getLastRefreshSummary(): Promise<RefreshSummary> {
    return await invoke<RefreshSummary>("get_last_refresh_summary")
  },

  async processRefreshResults(): Promise<string> {
    return await invoke<string>("process_refresh_results")
  }
} 