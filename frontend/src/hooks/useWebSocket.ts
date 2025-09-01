import { useEffect, useState } from 'react'
import { useBookmarkStore } from '@/stores/useBookmarkStore'
import { webSocketService } from '@/services/websocket'

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { 
    addBookmark, 
    updateBookmark, 
    deleteBookmark,
    addGroup,
    updateGroup,
    deleteGroup 
  } = useBookmarkStore()

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await webSocketService.connect()
        setIsConnected(true)
        setError(null)

        // Set up event listeners
        webSocketService.onBookmarkAdded((bookmark) => {
          addBookmark(bookmark)
        })

        webSocketService.onBookmarkUpdated((bookmark) => {
          updateBookmark(bookmark.id, bookmark)
        })

        webSocketService.onBookmarkDeleted((bookmarkId) => {
          deleteBookmark(bookmarkId)
        })

        webSocketService.onGroupAdded((group) => {
          addGroup(group)
        })

        webSocketService.onGroupUpdated((group) => {
          updateGroup(group.id, group)
        })

        webSocketService.onGroupDeleted((groupId) => {
          deleteGroup(groupId)
        })

        // Join the main bookmarks room
        webSocketService.joinRoom('bookmarks')

      } catch (err) {
        console.error('WebSocket connection failed:', err)
        setError(err instanceof Error ? err.message : 'Connection failed')
        setIsConnected(false)
      }
    }

    connectWebSocket()

    return () => {
      webSocketService.removeAllListeners()
      webSocketService.disconnect()
      setIsConnected(false)
    }
  }, [addBookmark, updateBookmark, deleteBookmark, addGroup, updateGroup, deleteGroup])

  return {
    isConnected,
    error,
    socket: webSocketService.getSocket()
  }
}