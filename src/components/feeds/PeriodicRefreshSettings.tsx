import React from 'react'
import { Clock, Wifi, User, Bell, Settings as SettingsIcon } from 'lucide-react'
import { usePeriodicRefresh } from '../../hooks/usePeriodicRefresh'
import { 
  DEFAULT_REFRESH_INTERVALS, 
  RefreshInterval,
  PeriodicRefreshSettings as PeriodicRefreshSettingsType 
} from '../../types/feed'

interface PeriodicRefreshSettingsProps {
  onClose?: () => void
}

export const PeriodicRefreshSettings: React.FC<PeriodicRefreshSettingsProps> = ({
  onClose
}) => {
  const {
    isAutoRefreshEnabled,
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
    getSettings,
  } = usePeriodicRefresh()

  const settings = getSettings()

  const formatTimeRemaining = (ms: number | null): string => {
    if (!ms) return 'Never'
    
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedInterval = DEFAULT_REFRESH_INTERVALS.find(
      interval => interval.value === parseInt(e.target.value)
    )
    if (selectedInterval) {
      setRefreshInterval(selectedInterval)
    }
  }

  const handleQuietHoursChange = (type: 'start' | 'end', value: string) => {
    const hour = parseInt(value)
    if (type === 'start') {
      setQuietHours(hour, settings.quietHours.endHour, settings.quietHours.enabled)
    } else {
      setQuietHours(settings.quietHours.startHour, hour, settings.quietHours.enabled)
    }
  }

  const toggleQuietHours = () => {
    setQuietHours(
      settings.quietHours.startHour,
      settings.quietHours.endHour,
      !settings.quietHours.enabled
    )
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Automatic Refresh Settings</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        )}
      </div>

      {/* Status Overview */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Current Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Auto Refresh:</span>
            <span className={`ml-2 font-medium ${isAutoRefreshEnabled ? 'text-green-600' : 'text-gray-500'}`}>
              {isAutoRefreshEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Next Refresh:</span>
            <span className="ml-2 font-medium">
              {timeUntilNextRefresh ? formatTimeRemaining(timeUntilNextRefresh) : 'Never'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Last Refresh:</span>
            <span className="ml-2 font-medium">
              {formatDateTime(lastRefreshTime)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Network:</span>
            <span className={`ml-2 font-medium ${
              status.connectionSpeed === 'fast' ? 'text-green-600' :
              status.connectionSpeed === 'moderate' ? 'text-yellow-600' : 'text-red-600'
            }`}>
                             {status.connectionSpeed ? status.connectionSpeed.charAt(0).toUpperCase() + status.connectionSpeed.slice(1) : 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-medium">Enable Automatic Refresh</h3>
            <p className="text-sm text-gray-600">
              Automatically refresh feeds in the background
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isAutoRefreshEnabled}
            onChange={toggleAutoRefresh}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Refresh Interval */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Refresh Interval
        </label>
        <select
          value={settings.interval.value}
          onChange={handleIntervalChange}
          disabled={!isAutoRefreshEnabled}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        >
          {DEFAULT_REFRESH_INTERVALS.map((interval) => (
            <option key={interval.value} value={interval.value}>
              {interval.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Quiet Hours
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.quietHours.enabled}
              onChange={toggleQuietHours}
              disabled={!isAutoRefreshEnabled}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {settings.quietHours.enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Hour</label>
              <select
                value={settings.quietHours.startHour}
                onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                disabled={!isAutoRefreshEnabled}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End Hour</label>
              <select
                value={settings.quietHours.endHour}
                onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                disabled={!isAutoRefreshEnabled}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {settings.quietHours.enabled && (
          <p className="text-xs text-gray-600">
            No automatic refreshes will occur between {settings.quietHours.startHour}:00 and {settings.quietHours.endHour}:00
            {status.isQuietHours && (
              <span className="ml-2 text-orange-600 font-medium">(Currently in quiet hours)</span>
            )}
          </p>
        )}
      </div>

      {/* Advanced Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Advanced Options</h3>
        
        {/* Pause on User Activity */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-600" />
            <div>
              <p className="text-sm font-medium">Pause on User Activity</p>
              <p className="text-xs text-gray-600">Skip refresh when you're actively using the app</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.pauseOnUserActivity}
              onChange={(e) => enablePauseOnActivity(e.target.checked)}
              disabled={!isAutoRefreshEnabled}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Bandwidth Awareness */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-gray-600" />
            <div>
              <p className="text-sm font-medium">Bandwidth Awareness</p>
              <p className="text-xs text-gray-600">Skip refresh on slow connections</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.bandwidthAware}
              onChange={(e) => enableBandwidthAwareness(e.target.checked)}
              disabled={!isAutoRefreshEnabled}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Desktop Notifications */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-600" />
            <div>
              <p className="text-sm font-medium">Desktop Notifications</p>
              <p className="text-xs text-gray-600">Show notifications when refresh completes</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableDesktopNotifications}
              onChange={(e) => enableDesktopNotifications(e.target.checked)}
              disabled={!isAutoRefreshEnabled}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Current Conditions */}
      {isAutoRefreshEnabled && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Current Conditions</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">User Active:</span>
              <span className={`font-medium ${status.isUserActive ? 'text-orange-600' : 'text-green-600'}`}>
                {status.isUserActive ? 'Yes (may delay refresh)' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Quiet Hours:</span>
              <span className={`font-medium ${status.isQuietHours ? 'text-orange-600' : 'text-green-600'}`}>
                {status.isQuietHours ? 'Yes (refresh paused)' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Network Speed:</span>
              <span className={`font-medium ${
                status.connectionSpeed === 'fast' ? 'text-green-600' :
                status.connectionSpeed === 'moderate' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {status.connectionSpeed}
                {status.connectionSpeed === 'slow' && settings.bandwidthAware && ' (may delay refresh)'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 