import React from 'react'
import { Button } from "@/components/ui/button"
import { RefreshProgress } from "../../types/feed"
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'

interface RefreshButtonProps {
  onRefresh: () => void
  isRefreshing?: boolean
  progress?: RefreshProgress | null
  error?: Error | string | null
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showProgress?: boolean
  disabled?: boolean
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  isRefreshing = false,
  progress = null,
  error = null,
  variant = 'default',
  size = 'default',
  showProgress = true,
  disabled = false
}) => {
  const handleClick = () => {
    if (!isRefreshing && !disabled) {
      onRefresh()
    }
  }

  // Determine button state and content
  const getButtonContent = () => {
    if (error) {
      return (
        <>
          <AlertTriangle className="h-4 w-4" />
          <span>Refresh Failed</span>
        </>
      )
    }

    if (isRefreshing && progress && showProgress) {
      const completed = progress.completed_feeds + progress.failed_feeds
      const total = progress.total_feeds
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
      
      return (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Refreshing ({completed}/{total}) {percentage}%</span>
        </>
      )
    }

    if (isRefreshing) {
      return (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Refreshing...</span>
        </>
      )
    }

    // Check if we have a recent successful refresh
    if (progress && !progress.is_active && progress.completed_feeds > 0) {
      return (
        <>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Refresh Feeds</span>
        </>
      )
    }

    return (
      <>
        <RefreshCw className="h-4 w-4" />
        <span>Refresh Feeds</span>
      </>
    )
  }

  // Determine button variant based on state
  const getButtonVariant = () => {
    if (error) return 'destructive'
    return variant
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isRefreshing || disabled}
      variant={getButtonVariant()}
      size={size}
      className="min-w-[140px]"
    >
      {getButtonContent()}
    </Button>
  )
} 