import { FeedResponse } from "../../types/feed"
import { FeedItem } from "./FeedItem"

interface FeedListProps {
  feeds: FeedResponse[]
  onDeleteFeed: (id: number) => Promise<boolean>
}

export const FeedList: React.FC<FeedListProps> = ({ feeds, onDeleteFeed }) => {
  if (feeds.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Feeds</h2>
      <div className="space-y-2">
        {feeds.map((feed) => (
          <FeedItem
            key={feed.id}
            feed={feed}
            onDelete={onDeleteFeed}
          />
        ))}
      </div>
    </div>
  )
} 