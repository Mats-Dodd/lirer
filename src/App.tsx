import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CreateFeedRequest {
  url: string
  title?: string
  description?: string
}

interface FeedResponse {
  id: number
  url: string
  title?: string
  description?: string
  created_at: string
  updated_at: string
  last_fetched_at?: string
}

function App() {
  const [feedUrl, setFeedUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [feeds, setFeeds] = useState<FeedResponse[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!feedUrl.trim()) {
      setMessage("Please enter a feed URL")
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      // Validate URL format
      new URL(feedUrl)
      
      const feedRequest: CreateFeedRequest = {
        url: feedUrl.trim(),
        title: undefined, // Will be updated when we fetch the feed
        description: undefined // Will be updated when we fetch the feed
      }

      const result = await invoke<FeedResponse>("create_feed", {
        request: feedRequest
      })

      setMessage(`Feed saved successfully! ID: ${result.id}`)
      setFeedUrl("")
      
      // Refresh the feeds list
      await loadFeeds()
      
    } catch (error) {
      if (error instanceof TypeError) {
        setMessage("Please enter a valid URL")
      } else {
        setMessage(`Error: ${error}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadFeeds = async () => {
    try {
      const result = await invoke<FeedResponse[]>("get_all_feeds")
      setFeeds(result)
    } catch (error) {
      console.error("Failed to load feeds:", error)
    }
  }

  const deleteFeed = async (id: number) => {
    try {
      await invoke<string>("delete_feed", { id })
      setMessage("Feed deleted successfully!")
      await loadFeeds()
    } catch (error) {
      setMessage(`Error deleting feed: ${error}`)
    }
  }

  // Load feeds on component mount
  useEffect(() => {
    loadFeeds()
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">RSS Feed Manager</h1>
          <p className="text-muted-foreground mt-2">
            Add RSS feeds to your reader
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="feedUrl" className="text-sm font-medium">
              Feed URL
            </label>
            <Input
              id="feedUrl"
              type="url"
              placeholder="https://example.com/rss.xml"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <Button type="submit" disabled={isLoading || !feedUrl.trim()}>
            {isLoading ? "Saving..." : "Add Feed"}
          </Button>
        </form>

        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes("Error") 
              ? "bg-destructive/10 text-destructive border border-destructive/20" 
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {message}
          </div>
        )}

        {feeds.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Feeds</h2>
            <div className="space-y-2">
              {feeds.map((feed) => (
                <div 
                  key={feed.id} 
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {feed.title || "Untitled Feed"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {feed.url}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added: {new Date(feed.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteFeed(feed.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App