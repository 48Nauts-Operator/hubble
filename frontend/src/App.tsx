import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { GroupSidebar } from '@/components/GroupSidebar'
import { BookmarkGrid } from '@/components/BookmarkGrid'
import { BookmarkList } from '@/components/BookmarkList'
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation'
import { AddBookmarkModal } from '@/components/AddBookmarkModal'
import { AddGroupModal } from '@/components/AddGroupModal'
import { EditBookmarkModal } from '@/components/EditBookmarkModal'
import { EditGroupModal } from '@/components/EditGroupModal'
import { DiscoveryPanel } from '@/components/DiscoveryPanel'
import { useBookmarkStore, type Bookmark, type BookmarkGroup } from '@/stores/useBookmarkStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useViewStore } from '@/stores/useViewStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useSearch } from '@/hooks/useSearch'
import { bookmarkApi, groupApi } from '@/services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle } from 'lucide-react'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddBookmarkModal, setShowAddBookmarkModal] = useState(false)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [showEditBookmarkModal, setShowEditBookmarkModal] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [showEditGroupModal, setShowEditGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<BookmarkGroup | null>(null)
  const [showDiscoveryPanel, setShowDiscoveryPanel] = useState(false)

  // Store hooks
  const {
    bookmarks,
    groups,
    searchQuery,
    selectedGroupId,
    breadcrumbs,
    setBookmarks,
    setGroups,
    setSelectedGroupId,
    setBreadcrumbs,
    filteredBookmarks,
    loading: storeLoading,
    error: storeError
  } = useBookmarkStore()

  // Theme initialization
  const { setTheme } = useThemeStore()
  
  // View mode
  const { viewMode } = useViewStore()

  // WebSocket connection
  const { isConnected, error: wsError } = useWebSocket()

  // Search functionality
  const searchResults = useSearch(bookmarks, searchQuery)

  // Get displayed bookmarks (filtered by group and search)
  const displayedBookmarks = searchQuery 
    ? searchResults
    : filteredBookmarks()

  // Initialize data on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Initialize theme from system preference if not set
        if (!localStorage.getItem('theme-storage')) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          setTheme(prefersDark)
        }

        // Load initial data
        const [bookmarksData, groupsData] = await Promise.all([
          bookmarkApi.getAllBookmarks().catch(() => []),
          groupApi.getAllGroups().catch(() => [])
        ])

        setBookmarks(bookmarksData)
        setGroups(groupsData)

      } catch (err) {
        console.error('Failed to initialize app:', err)
        setError('Failed to load data. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [setBookmarks, setGroups, setTheme])

  // Event handlers
  const handleAddBookmark = () => {
    console.log('NEW: Opening add bookmark modal')
    setShowAddBookmarkModal(true)
  }

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark)
    setShowEditBookmarkModal(true)
  }

  const handleDeleteBookmark = async (id: string) => {
    try {
      await bookmarkApi.deleteBookmark(id)
      // WebSocket will handle the state update
    } catch (err) {
      console.error('Failed to delete bookmark:', err)
    }
  }

  const handleAddGroup = () => {
    console.log('NEW: Opening add group modal')
    setShowAddGroupModal(true)
  }

  const handleEditGroup = (group: BookmarkGroup) => {
    setEditingGroup(group)
    setShowEditGroupModal(true)
  }

  const handleDiscover = () => {
    setShowDiscoveryPanel(true)
  }

  const handleServicesImported = async () => {
    // Refresh data after services are imported
    try {
      const [bookmarksData, groupsData] = await Promise.all([
        bookmarkApi.getAllBookmarks().catch(() => []),
        groupApi.getAllGroups().catch(() => [])
      ])
      setBookmarks(bookmarksData)
      setGroups(groupsData)
    } catch (err) {
      console.error('Failed to refresh data after import:', err)
    }
  }


  const handleBreadcrumbNavigate = (groupId: string | null) => {
    setSelectedGroupId(groupId)
    
    // Update breadcrumbs by finding the clicked item and removing everything after it
    const clickedIndex = breadcrumbs.findIndex(item => item.id === groupId)
    if (clickedIndex >= 0) {
      setBreadcrumbs(breadcrumbs.slice(0, clickedIndex + 1))
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await groupApi.deleteGroup(groupId)
      // If we're currently viewing this group, go back to home
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null)
        setBreadcrumbs([{ id: null, name: 'Home' }])
      }
      // WebSocket will handle the state update
    } catch (err) {
      console.error('Failed to delete group:', err)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Hubble...</p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error || storeError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4 max-w-md text-center"
        >
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            {error || storeError || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            Reload Page
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        onAddBookmark={handleAddBookmark}
        onAddGroup={handleAddGroup}
        onDiscover={handleDiscover}
      />

      <div className="flex">
        {/* Sidebar */}
        <GroupSidebar
          onAddGroup={handleAddGroup}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
        />

        {/* Main Content */}
        <motion.main
          className="flex-1 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Status indicators */}
          <div className="mb-6">
            {wsError && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"
              >
                WebSocket connection failed: {wsError}
              </motion.div>
            )}
            
            {!isConnected && !wsError && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-700 dark:text-yellow-300"
              >
                Connecting to real-time updates...
              </motion.div>
            )}
          </div>

          {/* Breadcrumb Navigation */}
          <BreadcrumbNavigation 
            breadcrumbs={showDiscoveryPanel ? [
              { id: null, name: 'Home' },
              { id: 'discovery', name: 'Discovery' }
            ] : breadcrumbs}
            onNavigate={showDiscoveryPanel ? (id) => {
              if (id === null) {
                setShowDiscoveryPanel(false)
              }
            } : handleBreadcrumbNavigate}
            className="mb-4"
          />

          {/* Content header */}
          {!showDiscoveryPanel && (
            <div className="mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-bold mb-2">
                  {selectedGroupId
                    ? groups.find(g => g.id === selectedGroupId)?.name || 'Unknown Group'
                    : searchQuery
                    ? `Search results for "${searchQuery}"`
                    : 'All Bookmarks'
                  }
                </h2>
                <p className="text-muted-foreground">
                  {(() => {
                    const selectedGroup = groups.find(g => g.id === selectedGroupId)
                    const isDocumentation = selectedGroup?.name === 'Documentation'
                    
                    if (isDocumentation) {
                      return `${displayedBookmarks.length} documentation resource${displayedBookmarks.length !== 1 ? 's' : ''}`
                    } else if (!selectedGroupId && !searchQuery) {
                      // For "All Bookmarks", mention it excludes documentation
                      const nonDocGroups = groups.filter(g => g.name !== 'Documentation').length
                      return (
                        <>
                          {displayedBookmarks.length} bookmark{displayedBookmarks.length !== 1 ? 's' : ''} 
                          across {nonDocGroups} group{nonDocGroups !== 1 ? 's' : ''}
                          <span className="text-xs ml-2 opacity-60">(excluding documentation)</span>
                        </>
                      )
                    } else if (selectedGroupId) {
                      return `${displayedBookmarks.length} bookmark${displayedBookmarks.length !== 1 ? 's' : ''} in ${selectedGroup?.name}`
                    } else {
                      return `${displayedBookmarks.length} bookmark${displayedBookmarks.length !== 1 ? 's' : ''}`
                    }
                  })()}
                </p>
              </motion.div>
            </div>
          )}

          {/* Main Content Grid */}
          <AnimatePresence mode="wait">
            {storeLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-12"
              >
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </motion.div>
            ) : showDiscoveryPanel ? (
              <motion.div
                key="discovery"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DiscoveryPanel
                  onServicesImported={() => {
                    handleServicesImported()
                    setShowDiscoveryPanel(false)
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Show either Grid or List based on view mode */}
                {viewMode === 'card' ? (
                  <BookmarkGrid
                    bookmarks={displayedBookmarks}
                    onEditBookmark={handleEditBookmark}
                    onDeleteBookmark={handleDeleteBookmark}
                    showControls={true}
                  />
                ) : (
                  <BookmarkList
                    bookmarks={displayedBookmarks}
                    onEditBookmark={handleEditBookmark}
                    onDeleteBookmark={handleDeleteBookmark}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.main>
      </div>

      {/* Modals */}
      <AddBookmarkModal
        isOpen={showAddBookmarkModal}
        onClose={() => setShowAddBookmarkModal(false)}
        groups={groups}
      />
      
      <AddGroupModal
        isOpen={showAddGroupModal}
        onClose={() => setShowAddGroupModal(false)}
        groups={groups}
      />
      
      <EditBookmarkModal
        isOpen={showEditBookmarkModal}
        onClose={() => {
          setShowEditBookmarkModal(false)
          setEditingBookmark(null)
        }}
        bookmark={editingBookmark}
        groups={groups}
      />
      
      <EditGroupModal
        isOpen={showEditGroupModal}
        onClose={() => {
          setShowEditGroupModal(false)
          setEditingGroup(null)
        }}
        group={editingGroup}
      />
    </div>
  )
}

export default App
// Cache bust: Sat Aug 31 10:50:51 PM EEST 2025
