import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { feedApi } from '../services/feedApi'
import { RefreshProgress, RefreshSummary } from '../types/feed'

interface UseRefreshProgressReturn {
  isRefreshing: boolean
  progress: RefreshProgress | null
  error: string | null
  lastSummary: RefreshSummary | null
  startRefresh: () => Promise<void>
  startSingleFeedRefresh: (feedId: number) => Promise<void>
  stopRefresh: () => void
}

// Exponential backoff configuration
const INITIAL_POLL_INTERVAL = 500 // 500ms
const MAX_POLL_INTERVAL = 5000 // 5 seconds
const BACKOFF_MULTIPLIER = 1.5
const MAX_RETRY_COUNT = 5

export const useRefreshProgress = (): UseRefreshProgressReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)
  const pollIntervalRef = useRef(INITIAL_POLL_INTERVAL)
  const retryCountRef = useRef(0)
  
  const queryClient = useQueryClient()

  // TanStack Query for refresh progress with caching
  const {
    data: progress,
    refetch: refetchProgress,
    isError: progressError,
  } = useQuery({
    queryKey: ['refreshProgress'],
    queryFn: () => feedApi.getRefreshProgress(),
    enabled: false, // Manually controlled
    staleTime: 100, // Very short stale time for real-time updates
    refetchInterval: false, // Manually controlled polling
    retry: false, // Handle retries manually with exponential backoff
  })

  // TanStack Query for last refresh summary with caching
  const { data: lastSummary } = useQuery({
    queryKey: ['lastRefreshSummary'],
    queryFn: () => feedApi.getLastRefreshSummary(),
    staleTime: 30000, // Cache for 30 seconds
    retry: 2,
  })

  // Mutation for starting refresh operations
  const refreshAllMutation = useMutation({
    mutationFn: () => feedApi.refreshAllFeeds(),
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      queryClient.invalidateQueries({ queryKey: ['refreshProgress'] })
    },
  })

  const refreshSingleFeedMutation = useMutation({
    mutationFn: (feedId: number) => feedApi.refreshSingleFeed(feedId),
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      queryClient.invalidateQueries({ queryKey: ['refreshProgress'] })
    },
  })

  // Enhanced polling with exponential backoff
  const pollProgress = useCallback(async () => {
    if (!isPollingRef.current) return

    try {
      const result = await refetchProgress()
      const progressData = result.data
      
      if (progressData) {
        // Reset backoff on successful poll
        pollIntervalRef.current = INITIAL_POLL_INTERVAL
        retryCountRef.current = 0
        
        // If refresh is complete, stop polling and fetch summary
        if (!progressData.is_active) {
          setIsRefreshing(false)
          isPollingRef.current = false
          
          // Invalidate and refetch the summary
          queryClient.invalidateQueries({ queryKey: ['lastRefreshSummary'] })
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          
          return
        }
      }
      
      // Schedule next poll with current interval
      if (isPollingRef.current) {
        intervalRef.current = setTimeout(pollProgress, pollIntervalRef.current)
      }
      
    } catch (err) {
      console.warn('Failed to poll refresh progress:', err)
      
      // Implement exponential backoff
      retryCountRef.current += 1
      
      if (retryCountRef.current >= MAX_RETRY_COUNT) {
        console.error('Max retry count reached, stopping polling')
        setError('Failed to get refresh progress after multiple retries')
        stopRefresh()
        return
      }
      
      // Apply exponential backoff
      pollIntervalRef.current = Math.min(
        pollIntervalRef.current * BACKOFF_MULTIPLIER,
        MAX_POLL_INTERVAL
      )
      
      console.log(`Retrying in ${pollIntervalRef.current}ms (attempt ${retryCountRef.current}/${MAX_RETRY_COUNT})`)
      
      // Schedule retry with backoff
      if (isPollingRef.current) {
        intervalRef.current = setTimeout(pollProgress, pollIntervalRef.current)
      }
    }
  }, [refetchProgress, queryClient])

  // Start polling when refresh begins
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
    }
    
    // Reset backoff state
    pollIntervalRef.current = INITIAL_POLL_INTERVAL
    retryCountRef.current = 0
    
    isPollingRef.current = true
    
    // Initial poll
    pollProgress()
  }, [pollProgress])

  // Start refresh for all feeds
  const startRefresh = useCallback(async () => {
    if (isRefreshing) return

    try {
      setError(null)
      setIsRefreshing(true)
      
      await refreshAllMutation.mutateAsync()
      
      // Start polling for progress updates
      startPolling()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start refresh')
      setIsRefreshing(false)
    }
  }, [isRefreshing, refreshAllMutation, startPolling])

  // Start refresh for a single feed
  const startSingleFeedRefresh = useCallback(async (feedId: number) => {
    if (isRefreshing) return

    try {
      setError(null)
      setIsRefreshing(true)
      
      await refreshSingleFeedMutation.mutateAsync(feedId)
      
      // Start polling for progress updates
      startPolling()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start feed refresh')
      setIsRefreshing(false)
    }
  }, [isRefreshing, refreshSingleFeedMutation, startPolling])

  // Stop refresh and cleanup
  const stopRefresh = useCallback(() => {
    setIsRefreshing(false)
    isPollingRef.current = false
    
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
    
    // Reset backoff state
    pollIntervalRef.current = INITIAL_POLL_INTERVAL
    retryCountRef.current = 0
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
      isPollingRef.current = false
    }
  }, [])

  // Handle TanStack Query errors
  useEffect(() => {
    if (progressError) {
      setError('Failed to fetch refresh progress')
    }
  }, [progressError])

  return {
    isRefreshing,
    progress: progress || null,
    error,
    lastSummary: lastSummary || null,
    startRefresh,
    startSingleFeedRefresh,
    stopRefresh
  }
} 