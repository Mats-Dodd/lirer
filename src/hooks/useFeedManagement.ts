import { useState, useCallback } from 'react'
import { useFeeds, useCreateFeed, useDeleteFeed } from './useFeeds'
import { MessageState } from '../types/feed'
import { feedApi } from '../services/feedApi'

export const useFeedManagement = () => {
  const [message, setMessage] = useState<MessageState | null>(null)
  
  // TanStack Query hooks
  const { data: feeds = [], isLoading: isFeedsLoading, error: feedsError } = useFeeds()
  const createFeedMutation = useCreateFeed()
  const deleteFeedMutation = useDeleteFeed()

  const clearMessage = useCallback(() => {
    setMessage(null)
  }, [])

  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
  }, [])

  const createFeed = useCallback(async (url: string): Promise<boolean> => {
    if (!url.trim()) {
      showMessage("Please enter a feed URL", 'error')
      return false
    }

    clearMessage()

    try {
      // Validate URL format
      new URL(url)
      
      // Parse the feed first
      console.log("🔍 Parsing feed from URL:", url.trim())
      const parsedFeed = await feedApi.parseFeedFromUrl(url.trim())
      
      console.log("✅ Successfully parsed feed:", parsedFeed)
      console.log(`📰 Feed title: ${parsedFeed.title}`)
      console.log(`📄 Number of entries: ${parsedFeed.entries.length}`)
      
      // For now, just show that parsing was successful
      // Later we'll integrate this with the actual feed creation
      showMessage(`Feed parsed successfully! Found "${parsedFeed.title}" with ${parsedFeed.entries.length} entries.`, 'success')
      return true
      
    } catch (error) {
      if (error instanceof TypeError) {
        showMessage("Please enter a valid URL", 'error')
      } else {
        showMessage(`Error parsing feed: ${error}`, 'error')
      }
      return false
    }
  }, [showMessage, clearMessage])

  const deleteFeed = useCallback(async (id: number): Promise<boolean> => {
    try {
      await deleteFeedMutation.mutateAsync(id)
      showMessage("Feed deleted successfully!", 'success')
      return true
    } catch (error) {
      showMessage(`Error deleting feed: ${error}`, 'error')
      return false
    }
  }, [deleteFeedMutation, showMessage])

  // Combine loading states from queries and mutations
  const isLoading = isFeedsLoading || createFeedMutation.isPending || deleteFeedMutation.isPending

  // Handle query errors
  if (feedsError) {
    console.error("Failed to load feeds:", feedsError)
    if (!message) {
      showMessage(`Error loading feeds: ${feedsError}`, 'error')
    }
  }

  return {
    feeds,
    isLoading,
    message,
    clearMessage,
    createFeed,
    deleteFeed
  }
} 