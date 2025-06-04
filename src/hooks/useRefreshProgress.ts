import { useState, useEffect, useCallback, useRef } from 'react'
import { feedApi } from '../services/feedApi'
import { RefreshProgress, RefreshResponse, RefreshSummary } from '../types/feed'

interface UseRefreshProgressReturn {
  isRefreshing: boolean
  progress: RefreshProgress | null
  error: string | null
  lastSummary: RefreshSummary | null
  startRefresh: () => Promise<void>
  startSingleFeedRefresh: (feedId: number) => Promise<void>
  stopRefresh: () => void
}

export const useRefreshProgress = (): UseRefreshProgressReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [progress, setProgress] = useState<RefreshProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSummary, setLastSummary] = useState<RefreshSummary | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  // Poll for refresh progress every 500ms during active refresh
  const pollProgress = useCallback(async () => {
    if (!isPollingRef.current) return

    try {
      const progressData = await feedApi.getRefreshProgress()
      setProgress(progressData)
      
      // If refresh is complete, stop polling and fetch summary
      if (!progressData.is_refreshing) {
        setIsRefreshing(false)
        isPollingRef.current = false
        
        try {
          const summary = await feedApi.getLastRefreshSummary()
          setLastSummary(summary)
        } catch (summaryError) {
          console.warn('Failed to fetch refresh summary:', summaryError)
        }
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (err) {
      console.error('Failed to poll refresh progress:', err)
      setError(err instanceof Error ? err.message : 'Failed to get refresh progress')
      stopRefresh()
    }
  }, [])

  // Start polling when refresh begins
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    isPollingRef.current = true
    intervalRef.current = setInterval(pollProgress, 500)
    
    // Initial poll
    pollProgress()
  }, [pollProgress])

  // Start refresh for all feeds
  const startRefresh = useCallback(async () => {
    if (isRefreshing) return

    try {
      setError(null)
      setIsRefreshing(true)
      
      const response: RefreshResponse = await feedApi.refreshAllFeeds()
      
      // Start polling for progress updates
      startPolling()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start refresh')
      setIsRefreshing(false)
    }
  }, [isRefreshing, startPolling])

  // Start refresh for a single feed
  const startSingleFeedRefresh = useCallback(async (feedId: number) => {
    if (isRefreshing) return

    try {
      setError(null)
      setIsRefreshing(true)
      
      const response: RefreshResponse = await feedApi.refreshSingleFeed(feedId)
      
      // Start polling for progress updates
      startPolling()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start feed refresh')
      setIsRefreshing(false)
    }
  }, [isRefreshing, startPolling])

  // Stop refresh and cleanup
  const stopRefresh = useCallback(() => {
    setIsRefreshing(false)
    isPollingRef.current = false
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      isPollingRef.current = false
    }
  }, [])

  // Load last refresh summary on mount
  useEffect(() => {
    const loadLastSummary = async () => {
      try {
        const summary = await feedApi.getLastRefreshSummary()
        setLastSummary(summary)
      } catch (err) {
        // Don't set error for this, it's just initial data
        console.warn('No previous refresh summary available')
      }
    }

    loadLastSummary()
  }, [])

  return {
    isRefreshing,
    progress,
    error,
    lastSummary,
    startRefresh,
    startSingleFeedRefresh,
    stopRefresh
  }
} 