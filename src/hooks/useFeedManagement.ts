import { useState, useCallback } from 'react'
import { useFeeds, useCreateFeed, useDeleteFeed } from './useFeeds'
import { MessageState } from '../types/feed'

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
      
      await createFeedMutation.mutateAsync({
        url: url.trim(),
        title: undefined,
        description: undefined
      })
      
      showMessage("Feed saved successfully!", 'success')
      return true
      
    } catch (error) {
      if (error instanceof TypeError) {
        showMessage("Please enter a valid URL", 'error')
      } else {
        showMessage(`Error: ${error}`, 'error')
      }
      return false
    }
  }, [createFeedMutation, showMessage, clearMessage])

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