import { invoke } from "@tauri-apps/api/core"
import { CreateFeedRequest, FeedResponse } from "../types/feed"

export const feedApi = {
  async createFeed(request: CreateFeedRequest): Promise<FeedResponse> {
    return await invoke<FeedResponse>("create_feed", { request })
  },

  async getAllFeeds(): Promise<FeedResponse[]> {
    return await invoke<FeedResponse[]>("get_all_feeds")
  },

  async deleteFeed(id: number): Promise<string> {
    return await invoke<string>("delete_feed", { id })
  }
} 