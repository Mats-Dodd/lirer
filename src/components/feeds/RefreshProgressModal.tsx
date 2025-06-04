import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RefreshProgress, RefreshError } from "../../types/feed"
import { CheckCircle, AlertCircle, Clock, RefreshCw, X } from 'lucide-react'

interface RefreshProgressModalProps {
  isOpen: boolean
  onClose: () => void
  progress: RefreshProgress | null
  autoCloseOnComplete?: boolean
}

export const RefreshProgressModal: React.FC<RefreshProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
  autoCloseOnComplete = true
}) => {
  // Auto-close when refresh is complete (if enabled)
  React.useEffect(() => {
    if (autoCloseOnComplete && progress && !progress.is_refreshing) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000) // Auto-close after 3 seconds
      
      return () => clearTimeout(timer)
    }
  }, [progress?.is_refreshing, autoCloseOnComplete, onClose])

  if (!progress) {
    return null
  }

  const completed = progress.completed_feeds
  const failed = progress.failed_feeds
  const total = progress.total_feeds
  const inProgress = total - completed - failed
  const percentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0

  const getStatusIcon = (error?: RefreshError) => {
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const formatErrorType = (errorType: RefreshError['error_type']) => {
    switch (errorType) {
      case 'network': return 'Network Error'
      case 'parse': return 'Parse Error'
      case 'timeout': return 'Timeout'
      default: return 'Unknown Error'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progress.is_refreshing ? (
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
          <DialogDescription>
            {progress.is_refreshing
              ? `Processing feeds... ${completed + failed} of ${total} completed`
              : `Refresh completed. ${completed} successful, ${failed} failed.`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Summary */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{percentage}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Successful</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{completed}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Failed</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{failed}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Remaining</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{inProgress}</div>
            </div>
          </div>

          {/* Current Feed */}
          {progress.is_refreshing && progress.current_feed_url && (
            <div className="p-3 bg-secondary rounded-md">
              <div className="text-sm font-medium">Currently Processing:</div>
              <div className="text-sm text-muted-foreground truncate">
                {progress.current_feed_url}
              </div>
            </div>
          )}

          {/* Error Details */}
          {progress.errors.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Feed Errors:</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {progress.errors.map((error, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-md bg-red-50 dark:bg-red-950/50"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">
                          {formatErrorType(error.error_type)}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {error.feed_url}
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          {error.error_message}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            {progress.is_refreshing ? 'Close' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 