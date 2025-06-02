import { MessageState } from "../../types/feed"

interface StatusMessageProps {
  message: MessageState | null
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ message }) => {
  if (!message) return null

  return (
    <div className={`p-3 rounded-md text-sm ${
      message.type === 'error'
        ? "bg-destructive/10 text-destructive border border-destructive/20" 
        : "bg-green-50 text-green-700 border border-green-200"
    }`}>
      {message.text}
    </div>
  )
} 