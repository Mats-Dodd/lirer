import { ParsedFeed, ParsedEntry, CreateFeedWithEntriesRequest, CreateFeedEntryRequest } from '../types/feed'

/**
 * Converts a ParsedFeed to CreateFeedWithEntriesRequest format
 * for persisting to the database
 */
export function convertParsedFeedToRequest(
  parsedFeed: ParsedFeed,
  originalUrl: string
): CreateFeedWithEntriesRequest {
  return {
    url: originalUrl,
    title: parsedFeed.title || undefined,
    description: parsedFeed.description || undefined,
    entries: parsedFeed.entries.map(entry => ({
      feed_id: 0, // Will be set by the backend during creation
      ...convertParsedEntryToRequest(entry)
    }))
  }
}

/**
 * Converts a ParsedEntry to CreateFeedEntryRequest format (without feed_id)
 */
export function convertParsedEntryToRequest(entry: ParsedEntry): Omit<CreateFeedEntryRequest, 'feed_id'> {
  return {
    title: entry.title || 'Untitled Entry',
    description: entry.description || undefined,
    link: entry.link || '',
    content: entry.content || undefined,
    published_at: entry.published ? formatDateForBackend(entry.published) : undefined
  }
}

/**
 * Formats a date string to ISO 8601 format for the backend
 */
function formatDateForBackend(dateString: string): string | undefined {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return undefined
    }
    return date.toISOString()
  } catch {
    return undefined
  }
}

/**
 * Creates a safe title from URL if no title is available
 */
export function createFallbackTitle(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return 'RSS Feed'
  }
} 