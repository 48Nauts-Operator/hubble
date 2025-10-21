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

enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

interface QueuedEvent {
  eventName: string
  data: any
  timestamp: number
}

class WebSocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventQueue: QueuedEvent[] = []
  private pendingCallbacks: ((socket: Socket) => void)[] = []
  private reconnectTimer: NodeJS.Timeout | null = null

  connect(url: string = window.location.hostname === 'localhost'
    ? 'http://localhost:8889'
    : ''): Promise<Socket> {

    // Return existing connection if already connected
    if (this.connectionState === ConnectionState.CONNECTED && this.socket?.connected) {
      return Promise.resolve(this.socket)
    }

    // Don't start new connection if one is already in progress
    if (this.connectionState === ConnectionState.CONNECTING || this.connectionState === ConnectionState.RECONNECTING) {
      return new Promise((resolve) => {
        this.pendingCallbacks.push(resolve)
      })
    }

    return new Promise((resolve, reject) => {
      this.connectionState = ConnectionState.CONNECTING
      this.pendingCallbacks.push(resolve)

      // Clear any existing reconnection timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }

      // Create socket if it doesn't exist or is disconnected
      if (!this.socket || !this.socket.connected) {
        this.socket = io(url, {
          autoConnect: true,
          reconnection: false, // Handle reconnection manually to avoid race conditions
          timeout: 5000,
          forceNew: true // Force new connection to avoid cached connections
        })

        this.setupEventHandlers()
      }

      // Connection timeout with proper cleanup
      const timeoutId = setTimeout(() => {
        if (this.connectionState !== ConnectionState.CONNECTED) {
          this.connectionState = ConnectionState.ERROR
          const error = new Error('WebSocket connection timeout')
          this.rejectPendingCallbacks(error)
          this.cleanup()
          reject(error)
        }
      }, 10000)

      // Clear timeout on successful connection
      this.socket.on('connect', () => {
        clearTimeout(timeoutId)
      })
    })
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Remove any existing listeners to avoid duplicates
    this.socket.removeAllListeners()

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id)
      this.connectionState = ConnectionState.CONNECTED
      this.reconnectAttempts = 0

      // Process queued events
      this.processEventQueue()

      // Resolve all pending connection promises
      this.resolvePendingCallbacks()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.connectionState = ConnectionState.DISCONNECTED

      // Only trigger reconnection for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
        this.startReconnection()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.connectionState = ConnectionState.ERROR
      this.reconnectAttempts++

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        const finalError = new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts: ${error.message}`)
        this.rejectPendingCallbacks(finalError)
        this.cleanup()
      } else {
        this.startReconnection()
      }
    })
  }

  private startReconnection() {
    if (this.connectionState === ConnectionState.RECONNECTING) {
      return // Reconnection already in progress
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.connectionState = ConnectionState.ERROR
      return
    }

    this.connectionState = ConnectionState.RECONNECTING
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)

    console.log(`Reconnecting... Attempt ${this.reconnectAttempts + 1} in ${delay}ms`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectAttempts++

      // Clean up old socket before reconnecting
      if (this.socket) {
        this.socket.removeAllListeners()
        this.socket.disconnect()
      }

      // Trigger new connection attempt
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error)
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.startReconnection()
        }
      })
    }, delay)
  }

  private resolvePendingCallbacks() {
    if (this.socket && this.connectionState === ConnectionState.CONNECTED) {
      const callbacks = [...this.pendingCallbacks]
      this.pendingCallbacks = []
      callbacks.forEach(callback => callback(this.socket!))
    }
  }

  private rejectPendingCallbacks(error: Error) {
    this.pendingCallbacks = []
    console.error('Rejecting pending callbacks:', error)
  }

  private processEventQueue() {
    if (this.connectionState === ConnectionState.CONNECTED && this.socket) {
      // Process events in chronological order
      const events = [...this.eventQueue].sort((a, b) => a.timestamp - b.timestamp)
      this.eventQueue = []

      events.forEach(event => {
        try {
          this.socket!.emit(event.eventName as any, event.data)
        } catch (error) {
          console.warn('Failed to process queued event:', event, error)
        }
      })

      if (events.length > 0) {
        console.log(`Processed ${events.length} queued events`)
      }
    }
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
    }

    this.eventQueue = []
    this.pendingCallbacks = []
    this.connectionState = ConnectionState.DISCONNECTED
  }

  disconnect() {
    this.cleanup()
  }

  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED && (this.socket?.connected || false)
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
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

  // Room management with event queuing
  joinRoom(room: string) {
    if (this.connectionState === ConnectionState.CONNECTED && this.socket?.connected) {
      this.socket.emit('joinRoom', room)
    } else {
      // Queue the event for when connection is established
      this.eventQueue.push({
        eventName: 'joinRoom',
        data: room,
        timestamp: Date.now()
      })
    }
  }

  leaveRoom(room: string) {
    if (this.connectionState === ConnectionState.CONNECTED && this.socket?.connected) {
      this.socket.emit('leaveRoom', room)
    } else {
      // Queue the event for when connection is established
      this.eventQueue.push({
        eventName: 'leaveRoom',
        data: room,
        timestamp: Date.now()
      })
    }
  }

  // Remove listeners
  removeAllListeners() {
    this.socket?.removeAllListeners()
  }
}

export const webSocketService = new WebSocketService()
export { ConnectionState }
export default webSocketService