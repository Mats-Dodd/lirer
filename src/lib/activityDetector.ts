/**
 * Activity detector and network monitor for smart background refresh scheduling
 */

type ActivityCallback = (isActive: boolean) => void
type NetworkCallback = (speed: 'slow' | 'moderate' | 'fast') => void

export class ActivityDetector {
  private static instance: ActivityDetector
  private isUserActive: boolean = false
  private lastActivityTime: number = Date.now()
  private activityTimeout: NodeJS.Timeout | null = null
  private activityCallbacks: Set<ActivityCallback> = new Set()
  private networkCallbacks: Set<NetworkCallback> = new Set()
  private currentNetworkSpeed: 'slow' | 'moderate' | 'fast' = 'fast'
  
  // Configuration
  private readonly ACTIVITY_TIMEOUT_MS = 60000 // 1 minute of inactivity
  private readonly NETWORK_TEST_INTERVAL_MS = 300000 // 5 minutes
  private networkTestTimeout: NodeJS.Timeout | null = null

  private constructor() {
    this.setupActivityListeners()
    this.startNetworkMonitoring()
  }

  public static getInstance(): ActivityDetector {
    if (!ActivityDetector.instance) {
      ActivityDetector.instance = new ActivityDetector()
    }
    return ActivityDetector.instance
  }

  /**
   * Set up event listeners for user activity detection
   */
  private setupActivityListeners(): void {
    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus',
    ]

    const handleActivity = () => {
      this.lastActivityTime = Date.now()
      
      if (!this.isUserActive) {
        this.isUserActive = true
        this.notifyActivityCallbacks(true)
      }

      // Reset timeout
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout)
      }

      this.activityTimeout = setTimeout(() => {
        this.isUserActive = false
        this.notifyActivityCallbacks(false)
      }, this.ACTIVITY_TIMEOUT_MS)
    }

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Handle window focus/blur
    window.addEventListener('focus', () => {
      this.isUserActive = true
      this.notifyActivityCallbacks(true)
    })

    window.addEventListener('blur', () => {
      // Don't immediately set to inactive on blur, use timeout instead
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout)
      }
      
      this.activityTimeout = setTimeout(() => {
        this.isUserActive = false
        this.notifyActivityCallbacks(false)
      }, this.ACTIVITY_TIMEOUT_MS)
    })
  }

  /**
   * Start monitoring network conditions
   */
  private startNetworkMonitoring(): void {
    // Initial network test
    this.testNetworkSpeed()

    // Periodic network testing
    this.networkTestTimeout = setInterval(() => {
      this.testNetworkSpeed()
    }, this.NETWORK_TEST_INTERVAL_MS)

    // Listen to connection changes if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', () => {
          setTimeout(() => this.testNetworkSpeed(), 1000) // Delay to allow connection to stabilize
        })
      }
    }
  }

  /**
   * Test network speed using a simple timing-based approach
   */
  private async testNetworkSpeed(): Promise<void> {
    try {
      const startTime = performance.now()
      
      // Make a small request to test latency
      // Use a cache-busting parameter to ensure fresh request
      const testUrl = `data:text/plain;base64,${btoa('test')}`
      const response = await fetch(testUrl)
      
      if (!response.ok) {
        throw new Error('Network test failed')
      }

      const endTime = performance.now()
      const latency = endTime - startTime

      // Categorize based on latency
      let speed: 'slow' | 'moderate' | 'fast'
      if (latency > 1000) {
        speed = 'slow'
      } else if (latency > 500) {
        speed = 'moderate'
      } else {
        speed = 'fast'
      }

      // Check navigator.connection for additional hints
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          const effectiveType = connection.effectiveType
          if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            speed = 'slow'
          } else if (effectiveType === '3g') {
            speed = 'moderate'
          }
        }
      }

      if (speed !== this.currentNetworkSpeed) {
        this.currentNetworkSpeed = speed
        this.notifyNetworkCallbacks(speed)
      }

    } catch (error) {
      console.warn('Network speed test failed:', error)
      // Assume moderate speed on error
      if (this.currentNetworkSpeed !== 'moderate') {
        this.currentNetworkSpeed = 'moderate'
        this.notifyNetworkCallbacks('moderate')
      }
    }
  }

  /**
   * Notify activity callbacks
   */
  private notifyActivityCallbacks(isActive: boolean): void {
    this.activityCallbacks.forEach(callback => {
      try {
        callback(isActive)
      } catch (error) {
        console.error('Activity callback error:', error)
      }
    })
  }

  /**
   * Notify network callbacks
   */
  private notifyNetworkCallbacks(speed: 'slow' | 'moderate' | 'fast'): void {
    this.networkCallbacks.forEach(callback => {
      try {
        callback(speed)
      } catch (error) {
        console.error('Network callback error:', error)
      }
    })
  }

  /**
   * Get current user activity status
   */
  public getIsUserActive(): boolean {
    return this.isUserActive
  }

  /**
   * Get current network speed
   */
  public getNetworkSpeed(): 'slow' | 'moderate' | 'fast' {
    return this.currentNetworkSpeed
  }

  /**
   * Get time since last activity
   */
  public getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivityTime
  }

  /**
   * Subscribe to activity changes
   */
  public onActivityChange(callback: ActivityCallback): () => void {
    this.activityCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.activityCallbacks.delete(callback)
    }
  }

  /**
   * Subscribe to network speed changes
   */
  public onNetworkChange(callback: NetworkCallback): () => void {
    this.networkCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.networkCallbacks.delete(callback)
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout)
    }
    
    if (this.networkTestTimeout) {
      clearInterval(this.networkTestTimeout)
    }

    this.activityCallbacks.clear()
    this.networkCallbacks.clear()
  }
}

// Export singleton instance
export const activityDetector = ActivityDetector.getInstance()

// Helper functions
export const isUserActive = () => activityDetector.getIsUserActive()
export const getNetworkSpeed = () => activityDetector.getNetworkSpeed()
export const getTimeSinceLastActivity = () => activityDetector.getTimeSinceLastActivity() 