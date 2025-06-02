import { useState, useCallback } from "react"
import { feedApi } from "../services/feedApi"
import { CreateFeedRequest, FeedResponse, MessageState } from "../types/feed"

export const useFeedsApi = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<MessageState | null>(null)

  const clearMessage = useCallback(() => {
    setMessage(null)
  }, [])

  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
  }, [])

  const createFeed = useCallback(async (url: string): Promise<FeedResponse | null> => {
    if (!url.trim()) {
      showMessage("Please enter a feed URL", 'error')
      return null
    }

    setIsLoading(true)
    clearMessage()

    try {
      // Validate URL format
      new URL(url)
      
      const feedRequest: CreateFeedRequest = {
        url: url.trim(),
        title: undefined,
        description: undefined
      }

      const result = await feedApi.createFeed(feedRequest)
      showMessage(`Feed saved successfully! ID: ${result.id}`, 'success')
      return result
      
    } catch (error) {
      if (error instanceof TypeError) {
        showMessage("Please enter a valid URL", 'error')
      } else {
        showMessage(`Error: ${error}`, 'error')
      }
      return null
    } finally {
      setIsLoading(false)
    }
  }, [showMessage, clearMessage])

  const getAllFeeds = useCallback(async (): Promise<FeedResponse[]> => {
    try {
      return await feedApi.getAllFeeds()
    } catch (error) {
      console.error("Failed to load feeds:", error)
      showMessage(`Error loading feeds: ${error}`, 'error')
      return []
    }
  }, [showMessage])

  const deleteFeed = useCallback(async (id: number): Promise<boolean> => {
    try {
      await feedApi.deleteFeed(id)
      showMessage("Feed deleted successfully!", 'success')
      return true
    } catch (error) {
      showMessage(`Error deleting feed: ${error}`, 'error')
      return false
    }
  }, [showMessage])

  return {
    isLoading,
    message,
    clearMessage,
    createFeed,
    getAllFeeds,
    deleteFeed
  }
} 