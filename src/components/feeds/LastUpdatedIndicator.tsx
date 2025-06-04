import React, { useState, useEffect } from 'react'
import { RefreshSummary } from "../../types/feed"
import { RefreshCw, Clock, Info } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface LastUpdatedIndicatorProps {
  lastSummary: RefreshSummary | null
  isRefreshing: boolean
  onClick?: () => void
  showDetails?: boolean
}

export const LastUpdatedIndicator: React.FC<LastUpdatedIndicatorProps> = ({
  lastSummary,
  isRefreshing,
  onClick,
  showDetails = false
}) => {
  const [relativeTime, setRelativeTime] = useState<string>('')

  // Update relative time every minute
  useEffect(() => {
    const updateRelativeTime = () => {
      if (!lastSummary) {
        setRelativeTime('')
        return
      }

      const now = new Date()
      const lastRefresh = new Date(lastSummary.timestamp)
      const diffMs = now.getTime() - lastRefresh.getTime()
      
      const minutes = Math.floor(diffMs / (1000 * 60))
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMs < 1000 * 60) {
        setRelativeTime('Just now')
      } else if (minutes < 60) {
        setRelativeTime(`${minutes} minute${minutes !== 1 ? 's' : ''} ago`)
      } else if (hours < 24) {
        setRelativeTime(`${hours} hour${hours !== 1 ? 's' : ''} ago`)
      } else {
        setRelativeTime(`${days} day${days !== 1 ? 's' : ''} ago`)
      }
    }

    updateRelativeTime()
    const interval = setInterval(updateRelativeTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [lastSummary])

  const formatDuration = (durationMs: number) => {
    const seconds = Math.round(durationMs / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (!lastSummary && !isRefreshing) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Never refreshed</span>
      </div>
    )
  }

  if (isRefreshing) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Refreshing now...</span>
      </div>
    )
  }

  const hasErrors = lastSummary && lastSummary.failed_count > 0
  const isClickable = !!onClick

  const content = (
    <div className={`flex items-center gap-2 text-sm ${
      hasErrors ? 'text-orange-600' : 'text-muted-foreground'
    } ${isClickable ? 'cursor-pointer hover:text-foreground transition-colors' : ''}`}>
      <Clock className="h-4 w-4" />
      <span>Last updated {relativeTime}</span>
      {hasErrors && (
        <div className="flex items-center gap-1 text-orange-600">
          <Info className="h-3 w-3" />
          <span className="text-xs">
            {lastSummary.failed_count} error{lastSummary.failed_count !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {showDetails && lastSummary && (
        <span className="text-xs">
          ({lastSummary.successful_count}/{lastSummary.total_processed} successful, {formatDuration(lastSummary.duration_seconds * 1000)})
        </span>
      )}
    </div>
  )

  if (isClickable) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClick}
        className="h-auto p-2 justify-start"
      >
        {content}
      </Button>
    )
  }

  return content
} 