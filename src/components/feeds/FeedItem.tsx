import { Button } from "@/components/ui/button"
import { FeedResponse } from "../../types/feed"
import { RefreshCw } from "lucide-react"

interface FeedItemProps {
  feed: FeedResponse
  onDelete: (id: number) => Promise<boolean>
  onRefresh?: (feedId: number) => Promise<void>
  isRefreshing?: boolean
}

export const FeedItem: React.FC<FeedItemProps> = ({ 
  feed, 
  onDelete, 
  onRefresh,
  isRefreshing = false 
}) => {
  const handleDelete = () => {
    onDelete(feed.id)
  }

  const handleRefresh = () => {
    if (onRefresh && !isRefreshing) {
      onRefresh(feed.id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatLastFetched = (lastFetchedAt?: string) => {
    if (!lastFetchedAt) {
      return "Never"
    }
    return new Date(lastFetchedAt).toLocaleDateString()
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {feed.title || "Untitled Feed"}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {feed.url}
        </p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Added: {formatDate(feed.created_at)}</span>
          <span>Last fetched: {formatLastFetched(feed.last_fetched_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh this feed</span>
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  )
} 