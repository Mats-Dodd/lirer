import { useState, useEffect, useCallback, useRef } from 'react'
import { useRefreshProgress } from './useRefreshProgress'
import { settingsManager } from '../lib/settings'
import { activityDetector } from '../lib/activityDetector'
import { 
  BackgroundRefreshStatus, 
  PeriodicRefreshSettings, 
  RefreshInterval 
} from '../types/feed'

interface UsePeriodicRefreshReturn {
  isAutoRefreshEnabled: boolean
  nextRefreshTime: string | null
  lastRefreshTime: string | null
  status: BackgroundRefreshStatus
  timeUntilNextRefresh: number | null
  toggleAutoRefresh: () => void
  setRefreshInterval: (interval: RefreshInterval) => void
  setQuietHours: (startHour: number, endHour: number, enabled?: boolean) => void
  enableBandwidthAwareness: (enabled: boolean) => void
  enablePauseOnActivity: (enabled: boolean) => void
  enableDesktopNotifications: (enabled: boolean) => void
  forceRefreshNow: () => Promise<void>
  getSettings: () => PeriodicRefreshSettings
}

// Configuration constants
const MIN_REFRESH_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes minimum
const NOTIFICATION_TIMEOUT_MS = 5000 // 5 seconds
const RETRY_DELAY_MS = 60000 // 1 minute retry delay on error

export const usePeriodicRefresh = (): UsePeriodicRefreshReturn => {
  const [settings, setSettings] = useState<PeriodicRefreshSettings>(
    () => settingsManager.getPeriodicRefreshSettings()
  )
  const [nextRefreshTime, setNextRefreshTime] = useState<string | null>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null)
  const [timeUntilNextRefresh, setTimeUntilNextRefresh] = useState<number | null>(null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isUserActiveRef = useRef(false)
  const networkSpeedRef = useRef<'slow' | 'moderate' | 'fast'>('fast')
  
  const { startRefresh, isRefreshing, lastSummary } = useRefreshProgress()

  /**
   * Calculate next refresh time based on interval and conditions
   */
  const calculateNextRefreshTime = useCallback((): Date | null => {
    if (!settings.enabled) return null

    const now = new Date()
    const intervalMs = Math.max(settings.interval.value * 60 * 1000, MIN_REFRESH_INTERVAL_MS)
    const nextTime = new Date(now.getTime() + intervalMs)

    return nextTime
  }, [settings])

  /**
   * Check if refresh should be skipped based on current conditions
   */
  const shouldSkipRefresh = useCallback((): { skip: boolean; reason?: string } => {
    // Check if refresh is already in progress
    if (isRefreshing) {
      return { skip: true, reason: 'Refresh already in progress' }
    }

    // Check quiet hours
    if (settingsManager.isQuietHours()) {
      return { skip: true, reason: 'Currently in quiet hours' }
    }

    // Check user activity if enabled
    if (settings.pauseOnUserActivity && isUserActiveRef.current) {
      return { skip: true, reason: 'User is currently active' }
    }

    // Check bandwidth if enabled
    if (settings.bandwidthAware && networkSpeedRef.current === 'slow') {
      return { skip: true, reason: 'Slow network connection detected' }
    }

    return { skip: false }
  }, [settings, isRefreshing])

  /**
   * Show desktop notification if enabled
   */
  const showNotification = useCallback((title: string, body: string, isError: boolean = false) => {
    if (!settings.enableDesktopNotifications) return

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: isError ? '/error-icon.png' : '/refresh-icon.png',
        tag: 'periodic-refresh',
        requireInteraction: false,
      })

      // Auto-close notification
      setTimeout(() => {
        notification.close()
      }, NOTIFICATION_TIMEOUT_MS)
    }
  }, [settings.enableDesktopNotifications])

  /**
   * Perform automatic refresh
   */
  const performAutoRefresh = useCallback(async (): Promise<void> => {
    const skipCheck = shouldSkipRefresh()
    
    if (skipCheck.skip) {
      console.log(`Skipping auto refresh: ${skipCheck.reason}`)
      
      // Reschedule for later (shorter interval if conditions will change)
      const rescheduleMs = isUserActiveRef.current ? 60000 : 300000 // 1 or 5 minutes
      const rescheduleTime = new Date(Date.now() + rescheduleMs)
      setNextRefreshTime(rescheduleTime.toISOString())
      
      timerRef.current = setTimeout(performAutoRefresh, rescheduleMs)
      return
    }

    try {
      console.log('Starting automatic refresh...')
      const startTime = new Date()
      setLastRefreshTime(startTime.toISOString())
      settingsManager.setLastAutoRefresh(startTime.toISOString())

      await startRefresh()

      // Show success notification
      showNotification(
        'Feed Refresh Complete',
        'Your feeds have been automatically updated.',
        false
      )

      console.log('Automatic refresh completed successfully')

    } catch (error) {
      console.error('Automatic refresh failed:', error)
      
      // Show error notification
      showNotification(
        'Feed Refresh Failed',
        'Failed to refresh feeds automatically. Will retry later.',
        true
      )

      // Schedule retry sooner than normal interval
      const retryTime = new Date(Date.now() + RETRY_DELAY_MS)
      setNextRefreshTime(retryTime.toISOString())
      timerRef.current = setTimeout(performAutoRefresh, RETRY_DELAY_MS)
      return
    }

    // Schedule next refresh
    scheduleNextRefresh()
  }, [shouldSkipRefresh, startRefresh, showNotification])

  /**
   * Schedule the next refresh
   */
  const scheduleNextRefresh = useCallback((): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!settings.enabled) {
      setNextRefreshTime(null)
      return
    }

    const nextTime = calculateNextRefreshTime()
    if (!nextTime) {
      setNextRefreshTime(null)
      return
    }

    setNextRefreshTime(nextTime.toISOString())

    const timeUntilRefresh = nextTime.getTime() - Date.now()
    
    if (timeUntilRefresh > 0) {
      timerRef.current = setTimeout(performAutoRefresh, timeUntilRefresh)
      console.log(`Next automatic refresh scheduled for: ${nextTime.toLocaleString()}`)
    }
  }, [settings, calculateNextRefreshTime, performAutoRefresh])

  /**
   * Update countdown timer
   */
  const updateCountdown = useCallback((): void => {
    if (!nextRefreshTime) {
      setTimeUntilNextRefresh(null)
      return
    }

    const now = Date.now()
    const nextTime = new Date(nextRefreshTime).getTime()
    const remaining = Math.max(0, nextTime - now)
    
    setTimeUntilNextRefresh(remaining)

    if (remaining > 0) {
      countdownTimerRef.current = setTimeout(updateCountdown, 1000)
    }
  }, [nextRefreshTime])

  /**
   * Toggle auto refresh on/off
   */
  const toggleAutoRefresh = useCallback((): void => {
    const newEnabled = !settings.enabled
    settingsManager.setPeriodicRefreshEnabled(newEnabled)
    
    const newSettings = settingsManager.getPeriodicRefreshSettings()
    setSettings(newSettings)

    if (newEnabled) {
      // Request notification permission if notifications are enabled
      if (newSettings.enableDesktopNotifications && 'Notification' in window) {
        Notification.requestPermission()
      }
    }
  }, [settings.enabled])

  /**
   * Set refresh interval
   */
  const setRefreshInterval = useCallback((interval: RefreshInterval): void => {
    settingsManager.setRefreshInterval(interval)
    const newSettings = settingsManager.getPeriodicRefreshSettings()
    setSettings(newSettings)
  }, [])

  /**
   * Set quiet hours
   */
  const setQuietHours = useCallback((startHour: number, endHour: number, enabled: boolean = true): void => {
    settingsManager.setQuietHours(startHour, endHour, enabled)
    const newSettings = settingsManager.getPeriodicRefreshSettings()
    setSettings(newSettings)
  }, [])

  /**
   * Enable/disable bandwidth awareness
   */
  const enableBandwidthAwareness = useCallback((enabled: boolean): void => {
    settingsManager.updatePeriodicRefreshSettings({ bandwidthAware: enabled })
    const newSettings = settingsManager.getPeriodicRefreshSettings()
    setSettings(newSettings)
  }, [])

  /**
   * Enable/disable pause on user activity
   */
  const enablePauseOnActivity = useCallback((enabled: boolean): void => {
    settingsManager.updatePeriodicRefreshSettings({ pauseOnUserActivity: enabled })
    const newSettings = settingsManager.getPeriodicRefreshSettings()
    setSettings(newSettings)
  }, [])

  /**
   * Enable/disable desktop notifications
   */
  const enableDesktopNotifications = useCallback((enabled: boolean): void => {
    settingsManager.updatePeriodicRefreshSettings({ enableDesktopNotifications: enabled })
    const newSettings = settingsManager.getPeriodicRefreshSettings()
    setSettings(newSettings)

    // Request permission if enabling
    if (enabled && 'Notification' in window) {
      Notification.requestPermission()
    }
  }, [])

  /**
   * Force refresh now, bypassing all conditions
   */
  const forceRefreshNow = useCallback(async (): Promise<void> => {
    try {
      const startTime = new Date()
      setLastRefreshTime(startTime.toISOString())
      settingsManager.setLastAutoRefresh(startTime.toISOString())

      await startRefresh()
      
      // Reschedule next refresh
      scheduleNextRefresh()
    } catch (error) {
      console.error('Manual refresh failed:', error)
      throw error
    }
  }, [startRefresh, scheduleNextRefresh])

  /**
   * Get current settings
   */
  const getSettings = useCallback((): PeriodicRefreshSettings => {
    return settingsManager.getPeriodicRefreshSettings()
  }, [])

  // Set up activity and network monitoring
  useEffect(() => {
    const unsubscribeActivity = activityDetector.onActivityChange((isActive) => {
      isUserActiveRef.current = isActive
    })

    const unsubscribeNetwork = activityDetector.onNetworkChange((speed) => {
      networkSpeedRef.current = speed
    })

    // Initialize current values
    isUserActiveRef.current = activityDetector.getIsUserActive()
    networkSpeedRef.current = activityDetector.getNetworkSpeed()

    return () => {
      unsubscribeActivity()
      unsubscribeNetwork()
    }
  }, [])

  // Initialize last refresh time from settings
  useEffect(() => {
    const lastRefresh = settings.lastAutoRefresh
    if (lastRefresh) {
      setLastRefreshTime(lastRefresh)
    }
  }, [settings.lastAutoRefresh])

  // Schedule refresh when settings change
  useEffect(() => {
    scheduleNextRefresh()
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [scheduleNextRefresh])

  // Update countdown timer when next refresh time changes
  useEffect(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current)
    }
    updateCountdown()
    
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current)
      }
    }
  }, [updateCountdown])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current)
      }
    }
  }, [])

  // Create status object
  const status: BackgroundRefreshStatus = {
    isScheduled: settings.enabled && nextRefreshTime !== null,
    nextRefreshTime,
    lastRefreshTime,
    isUserActive: isUserActiveRef.current,
    isQuietHours: settingsManager.isQuietHours(),
    connectionSpeed: networkSpeedRef.current,
  }

  return {
    isAutoRefreshEnabled: settings.enabled,
    nextRefreshTime,
    lastRefreshTime,
    status,
    timeUntilNextRefresh,
    toggleAutoRefresh,
    setRefreshInterval,
    setQuietHours,
    enableBandwidthAwareness,
    enablePauseOnActivity,
    enableDesktopNotifications,
    forceRefreshNow,
    getSettings,
  }
} 