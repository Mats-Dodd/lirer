import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface FeedFormProps {
  onSubmit: (url: string) => Promise<boolean>
  isLoading: boolean
}

export const FeedForm: React.FC<FeedFormProps> = ({ onSubmit, isLoading }) => {
  const [feedUrl, setFeedUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const success = await onSubmit(feedUrl)
    if (success) {
      setFeedUrl("") // Clear form on success
    }
  }

  return (
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
  )
} 