import { Button } from "@/components/ui/button"
import { FeedResponse } from "../../types/feed"

interface FeedItemProps {
  feed: FeedResponse
  onDelete: (id: number) => Promise<boolean>
}

export const FeedItem: React.FC<FeedItemProps> = ({ feed, onDelete }) => {
  const handleDelete = () => {
    onDelete(feed.id)
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
        <p className="text-xs text-muted-foreground">
          Added: {new Date(feed.created_at).toLocaleDateString()}
        </p>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  )
} 