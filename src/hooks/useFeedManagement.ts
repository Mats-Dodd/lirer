import { useState, useEffect, useCallback } from "react"
import { FeedResponse } from "../types/feed"
import { useFeedsApi } from "./useFeedsApi"

export const useFeedManagement = () => {
  const [feeds, setFeeds] = useState<FeedResponse[]>([])
  const feedsApi = useFeedsApi()

  const loadFeeds = useCallback(async () => {
    const feedsData = await feedsApi.getAllFeeds()
    setFeeds(feedsData)
  }, [feedsApi])

  const handleCreateFeed = useCallback(async (url: string) => {
    const newFeed = await feedsApi.createFeed(url)
    if (newFeed) {
      await loadFeeds() // Refresh the feeds list
      return true
    }
    return false
  }, [feedsApi, loadFeeds])

  const handleDeleteFeed = useCallback(async (id: number) => {
    const success = await feedsApi.deleteFeed(id)
    if (success) {
      await loadFeeds() // Refresh the feeds list
    }
    return success
  }, [feedsApi, loadFeeds])

  // Load feeds on mount
  useEffect(() => {
    loadFeeds()
  }, [loadFeeds])

  return {
    feeds,
    isLoading: feedsApi.isLoading,
    message: feedsApi.message,
    clearMessage: feedsApi.clearMessage,
    createFeed: handleCreateFeed,
    deleteFeed: handleDeleteFeed,
    refreshFeeds: loadFeeds
  }
} 