import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedApi } from '../services/feedApi'
import { CreateFeedRequest, FeedResponse } from '../types/feed'

// Query keys for consistent cache management
export const feedKeys = {
  all: ['feeds'] as const,
  lists: () => [...feedKeys.all, 'list'] as const,
  list: (filters: string) => [...feedKeys.lists(), { filters }] as const,
  details: () => [...feedKeys.all, 'detail'] as const,
  detail: (id: number) => [...feedKeys.details(), id] as const,
}

// Hook to fetch all feeds
export const useFeeds = () => {
  return useQuery({
    queryKey: feedKeys.lists(),
    queryFn: () => feedApi.getAllFeeds(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook to create a new feed
export const useCreateFeed = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateFeedRequest) => feedApi.createFeed(request),
    onSuccess: () => {
      // Invalidate and refetch feeds list
      queryClient.invalidateQueries({ queryKey: feedKeys.lists() })
    },
  })
}

// Hook to delete a feed
export const useDeleteFeed = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => feedApi.deleteFeed(id),
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedKeys.lists() })

      // Snapshot the previous value
      const previousFeeds = queryClient.getQueryData<FeedResponse[]>(feedKeys.lists())

      // Optimistically update to the new value
      queryClient.setQueryData<FeedResponse[]>(feedKeys.lists(), (old) => 
        old?.filter((feed) => feed.id !== deletedId) || []
      )

      // Return a context object with the snapshotted value
      return { previousFeeds }
    },
    onError: (_err, _deletedId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(feedKeys.lists(), context?.previousFeeds)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: feedKeys.lists() })
    },
  })
} 