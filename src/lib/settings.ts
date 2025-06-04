import { 
  AppSettings, 
  DEFAULT_APP_SETTINGS, 
  PeriodicRefreshSettings,
  DEFAULT_PERIODIC_REFRESH_SETTINGS,
  RefreshInterval,
  DEFAULT_REFRESH_INTERVALS
} from '../types/feed'

const SETTINGS_STORAGE_KEY = 'reader_app_settings'

/**
 * Settings utility for managing user preferences in localStorage
 */
export class SettingsManager {
  private static instance: SettingsManager
  private settings: AppSettings

  private constructor() {
    this.settings = this.loadSettings()
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager()
    }
    return SettingsManager.instance
  }

  /**
   * Load settings from localStorage with fallback to defaults
   */
  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>
        
        // Merge with defaults to ensure all required fields exist
        return {
          periodicRefresh: {
            ...DEFAULT_PERIODIC_REFRESH_SETTINGS,
            ...parsed.periodicRefresh,
          },
          general: {
            ...DEFAULT_APP_SETTINGS.general,
            ...parsed.general,
          },
        }
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error)
    }
    
    return { ...DEFAULT_APP_SETTINGS }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings))
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error)
    }
  }

  /**
   * Get all current settings
   */
  public getSettings(): AppSettings {
    return { ...this.settings }
  }

  /**
   * Get periodic refresh settings
   */
  public getPeriodicRefreshSettings(): PeriodicRefreshSettings {
    return { ...this.settings.periodicRefresh }
  }

  /**
   * Update periodic refresh settings
   */
  public updatePeriodicRefreshSettings(updates: Partial<PeriodicRefreshSettings>): void {
    this.settings.periodicRefresh = {
      ...this.settings.periodicRefresh,
      ...updates,
    }
    this.saveSettings()
  }

  /**
   * Enable/disable periodic refresh
   */
  public setPeriodicRefreshEnabled(enabled: boolean): void {
    this.updatePeriodicRefreshSettings({ enabled })
  }

  /**
   * Set refresh interval
   */
  public setRefreshInterval(interval: RefreshInterval): void {
    this.updatePeriodicRefreshSettings({ interval })
  }

  /**
   * Set quiet hours configuration
   */
  public setQuietHours(startHour: number, endHour: number, enabled: boolean = true): void {
    this.updatePeriodicRefreshSettings({
      quietHours: { startHour, endHour, enabled }
    })
  }

  /**
   * Update last auto refresh timestamp
   */
  public setLastAutoRefresh(timestamp: string): void {
    this.updatePeriodicRefreshSettings({ lastAutoRefresh: timestamp })
  }

  /**
   * Check if currently in quiet hours
   */
  public isQuietHours(): boolean {
    const { quietHours } = this.settings.periodicRefresh
    if (!quietHours.enabled) return false

    const now = new Date()
    const currentHour = now.getHours()
    
    // Handle overnight quiet hours (e.g., 23:00 to 07:00)
    if (quietHours.startHour > quietHours.endHour) {
      return currentHour >= quietHours.startHour || currentHour < quietHours.endHour
    }
    
    // Handle same-day quiet hours (e.g., 01:00 to 06:00)
    return currentHour >= quietHours.startHour && currentHour < quietHours.endHour
  }

  /**
   * Get available refresh intervals
   */
  public getAvailableRefreshIntervals(): RefreshInterval[] {
    return [...DEFAULT_REFRESH_INTERVALS]
  }

  /**
   * Reset settings to defaults
   */
  public resetToDefaults(): void {
    this.settings = { ...DEFAULT_APP_SETTINGS }
    this.saveSettings()
  }

  /**
   * Export settings as JSON string
   */
  public exportSettings(): string {
    return JSON.stringify(this.settings, null, 2)
  }

  /**
   * Import settings from JSON string
   */
  public importSettings(settingsJson: string): boolean {
    try {
      const imported = JSON.parse(settingsJson) as Partial<AppSettings>
      
      // Validate structure
      if (typeof imported !== 'object' || imported === null) {
        throw new Error('Invalid settings format')
      }

      // Merge with defaults to ensure data integrity
      this.settings = {
        periodicRefresh: {
          ...DEFAULT_PERIODIC_REFRESH_SETTINGS,
          ...imported.periodicRefresh,
        },
        general: {
          ...DEFAULT_APP_SETTINGS.general,
          ...imported.general,
        },
      }
      
      this.saveSettings()
      return true
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }
}

// Export singleton instance
export const settingsManager = SettingsManager.getInstance()

// Helper functions for common operations
export const getPeriodicRefreshSettings = () => settingsManager.getPeriodicRefreshSettings()
export const isPeriodicRefreshEnabled = () => settingsManager.getPeriodicRefreshSettings().enabled
export const isQuietHours = () => settingsManager.isQuietHours()
export const setPeriodicRefreshEnabled = (enabled: boolean) => settingsManager.setPeriodicRefreshEnabled(enabled)
export const setRefreshInterval = (interval: RefreshInterval) => settingsManager.setRefreshInterval(interval) 