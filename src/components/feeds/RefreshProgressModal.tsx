import React, { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, RefreshCw } from 'lucide-react'
import { RefreshProgress } from "../../types/feed"

interface RefreshProgressModalProps {
  progress: RefreshProgress | null
  isOpen: boolean
  onClose: () => void
  autoCloseOnComplete?: boolean
}

export const RefreshProgressModal: React.FC<RefreshProgressModalProps> = ({
  progress,
  isOpen,
  onClose,
  autoCloseOnComplete = false
}) => {
  // Auto-close when refresh completes (optional)
  useEffect(() => {
    if (autoCloseOnComplete && progress && !progress.is_active) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000) // Auto-close after 3 seconds
      return () => clearTimeout(timer)
    }
  }, [progress?.is_active, autoCloseOnComplete, onClose])

  if (!progress) {
    return null
  }

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return 'Calculating...'
    if (seconds < 60) return `${Math.round(seconds)}s remaining`
    return `${Math.round(seconds / 60)}m remaining`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progress.is_active ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Refreshing Feeds
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Refresh Complete
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress.progress_percentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress_percentage}%` }}
              />
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {progress.completed_feeds - progress.failed_feeds}
              </div>
              <div className="text-xs text-muted-foreground">Successful</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">{progress.failed_feeds}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {progress.total_feeds - progress.completed_feeds}
              </div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
          </div>

          {/* Current Feed */}
          {progress.is_active && progress.current_feed_url && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Currently processing:</div>
              <div className="text-xs text-muted-foreground truncate">
                {progress.current_feed_url}
              </div>
            </div>
          )}

          {/* Time Remaining */}
          {progress.estimated_time_remaining && (
            <div className="text-center text-sm text-muted-foreground">
              {formatTimeRemaining(progress.estimated_time_remaining)}
            </div>
          )}

          {/* Error Details */}
          {progress.errors.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-red-600">
                Errors ({progress.errors.length})
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {progress.errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="p-2 bg-red-50 rounded text-xs">
                    <div className="font-medium">{error.feed_title || error.feed_url}</div>
                    <div className="text-red-600">{error.error_message}</div>
                  </div>
                ))}
                {progress.errors.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center">
                    ... and {progress.errors.length - 5} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              {progress.is_active ? 'Close' : 'Done'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 