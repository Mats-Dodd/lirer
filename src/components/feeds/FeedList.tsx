import React, { useState } from "react"
import { FeedResponse } from "../../types/feed"
import { FeedItem } from "./FeedItem"
import { RefreshButton } from "./RefreshButton"
import { RefreshProgressModal } from "./RefreshProgressModal"
import { LastUpdatedIndicator } from "./LastUpdatedIndicator"
import { useRefreshProgress } from "../../hooks"

interface FeedListProps {
  feeds: FeedResponse[]
  onDeleteFeed: (id: number) => Promise<boolean>
}

export const FeedList: React.FC<FeedListProps> = ({ feeds, onDeleteFeed }) => {
  const [showProgressModal, setShowProgressModal] = useState(false)
  const {
    isRefreshing,
    progress,
    error,
    lastSummary,
    startRefresh,
    startSingleFeedRefresh
  } = useRefreshProgress()

  const handleRefreshAll = async () => {
    setShowProgressModal(true)
    await startRefresh()
  }

  const handleShowLastRefreshDetails = () => {
    if (lastSummary) {
      setShowProgressModal(true)
    }
  }

  if (feeds.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Feeds</h2>
        <div className="flex items-center gap-4">
          <LastUpdatedIndicator
            lastSummary={lastSummary}
            isRefreshing={isRefreshing}
            onClick={handleShowLastRefreshDetails}
            showDetails={false}
          />
          <RefreshButton
            onRefresh={handleRefreshAll}
            isRefreshing={isRefreshing}
            progress={progress}
            error={error}
            showProgress={true}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        {feeds.map((feed) => (
          <FeedItem
            key={feed.id}
            feed={feed}
            onDelete={onDeleteFeed}
            onRefresh={startSingleFeedRefresh}
            isRefreshing={isRefreshing}
          />
        ))}
      </div>

      <RefreshProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        progress={progress}
        autoCloseOnComplete={true}
      />
    </div>
  )
} 