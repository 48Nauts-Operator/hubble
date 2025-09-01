import { io, Socket } from 'socket.io-client'
import type { Bookmark, BookmarkGroup } from '@/stores/useBookmarkStore'

export interface ServerToClientEvents {
  bookmarkAdded: (bookmark: Bookmark) => void
  bookmarkUpdated: (bookmark: Bookmark) => void
  bookmarkDeleted: (bookmarkId: string) => void
  groupAdded: (group: BookmarkGroup) => void
  groupUpdated: (group: BookmarkGroup) => void
  groupDeleted: (groupId: string) => void
  connect: () => void
  disconnect: () => void
  error: (error: string) => void
}

export interface ClientToServerEvents {
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
}

class WebSocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(url: string = window.location.hostname === 'localhost' 
    ? 'http://localhost:8889' 
    : ''): Promise<Socket> {
    return new Promise((resolve, reject) => {
      this.socket = io(url, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 5000
      })

      this.socket.on('connect', () => {
        console.log('WebSocket connected:', this.socket?.id)
        this.reconnectAttempts = 0
        resolve(this.socket!)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason)
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, reconnect manually
          this.reconnect()
        }
      })

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        this.reconnectAttempts++
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`))
        }
      })

      // Set connection timeout
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('WebSocket connection timeout'))
        }
      }, 10000)
    })
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`)
        this.socket?.connect()
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts))
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket
  }

  // Event listeners
  onBookmarkAdded(callback: (bookmark: Bookmark) => void) {
    this.socket?.on('bookmarkAdded', callback)
  }

  onBookmarkUpdated(callback: (bookmark: Bookmark) => void) {
    this.socket?.on('bookmarkUpdated', callback)
  }

  onBookmarkDeleted(callback: (bookmarkId: string) => void) {
    this.socket?.on('bookmarkDeleted', callback)
  }

  onGroupAdded(callback: (group: BookmarkGroup) => void) {
    this.socket?.on('groupAdded', callback)
  }

  onGroupUpdated(callback: (group: BookmarkGroup) => void) {
    this.socket?.on('groupUpdated', callback)
  }

  onGroupDeleted(callback: (groupId: string) => void) {
    this.socket?.on('groupDeleted', callback)
  }

  // Room management
  joinRoom(room: string) {
    this.socket?.emit('joinRoom', room)
  }

  leaveRoom(room: string) {
    this.socket?.emit('leaveRoom', room)
  }

  // Remove listeners
  removeAllListeners() {
    this.socket?.removeAllListeners()
  }
}

export const webSocketService = new WebSocketService()
export default webSocketService