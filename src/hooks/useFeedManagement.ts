import { useState, useCallback } from 'react'
import { useFeeds, useCreateFeed, useDeleteFeed } from './useFeeds'
import { MessageState } from '../types/feed'
import { feedApi } from '../services/feedApi'
import { convertParsedFeedToRequest, createFallbackTitle } from '../lib/feedUtils'

export const useFeedManagement = () => {
  const [message, setMessage] = useState<MessageState | null>(null)
  
  // TanStack Query hooks
  const { data: feeds = [], isLoading: isFeedsLoading, error: feedsError, refetch: refetchFeeds } = useFeeds()
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
      
      // Convert parsed feed to the format expected by backend
      const feedRequest = convertParsedFeedToRequest(parsedFeed, url.trim())
      
      // Ensure we have a title
      if (!feedRequest.title) {
        feedRequest.title = createFallbackTitle(url.trim())
      }
      
      console.log("💾 Creating feed with entries in database...")
      
      // Create the feed with all its entries in the database
      const createdFeed = await feedApi.createFeedWithEntries(feedRequest)
      
      console.log("✅ Successfully created feed:", createdFeed)
      
      // Refresh the feeds list
      await refetchFeeds()
      
      showMessage(
        `Feed "${createdFeed.title || 'Untitled Feed'}" added successfully with ${createdFeed.entries.length} entries!`, 
        'success'
      )
      return true
      
    } catch (error) {
      console.error("❌ Error creating feed:", error)
      if (error instanceof TypeError) {
        showMessage("Please enter a valid URL", 'error')
      } else {
        showMessage(`Error adding feed: ${error}`, 'error')
      }
      return false
    }
  }, [showMessage, clearMessage, refetchFeeds])

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