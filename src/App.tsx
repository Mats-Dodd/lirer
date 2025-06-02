import { useFeedManagement } from "./hooks"
import { FeedForm, FeedList, StatusMessage } from "./components/feeds"
import { PageLayout } from "./components/layout/PageLayout"

function App() {
  const {
    feeds,
    isLoading,
    message,
    createFeed,
    deleteFeed
  } = useFeedManagement()

  return (
    <PageLayout 
      title="RSS Feed Manager" 
      subtitle="Add RSS feeds to your reader"
    >
      <FeedForm 
        onSubmit={createFeed}
        isLoading={isLoading}
      />

      <StatusMessage message={message} />

      <FeedList 
        feeds={feeds}
        onDeleteFeed={deleteFeed}
      />
    </PageLayout>
  )
}

export default App