import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type Environment = 'development' | 'staging' | 'production' | 'uat' | 'local'
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown'

export interface Bookmark {
  id: string
  title: string
  url: string
  internalUrl?: string // Internal network URL (e.g., http://192.168.1.100:3000)
  externalUrl?: string // External/public URL (e.g., https://myservice.com)
  description?: string
  favicon?: string
  icon?: string
  tags: string[]
  groupId?: string
  environment?: Environment
  healthStatus?: HealthStatus
  clickCount: number
  lastClicked?: Date
  createdAt: Date
  updatedAt: Date
}

export interface BookmarkGroup {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  parentId?: string
  bookmarks: Bookmark[]
  subgroups?: BookmarkGroup[]
  createdAt: Date
  updatedAt: Date
}

export type SortOption = 'alphabetical' | 'mostClicked' | 'recent' | 'oldest'
export type FilterOption = 'all' | 'development' | 'staging' | 'production' | 'uat' | 'local'

// Memoization cache for filtered bookmarks
interface BookmarkCache {
  key: string
  result: Bookmark[]
}

interface BookmarkStore {
  // State
  bookmarks: Bookmark[]
  groups: BookmarkGroup[]
  loading: boolean
  error: string | null
  searchQuery: string
  selectedGroupId: string | null
  sortBy: SortOption
  filterBy: FilterOption
  breadcrumbs: { id: string | null; name: string }[]

  // Internal cache for memoization
  _filteredBookmarksCache: BookmarkCache | null

  // Actions
  setBookmarks: (bookmarks: Bookmark[]) => void
  setGroups: (groups: BookmarkGroup[]) => void
  addBookmark: (bookmark: Bookmark) => void
  updateBookmark: (id: string, bookmark: Partial<Bookmark>) => void
  deleteBookmark: (id: string) => void
  incrementClickCount: (bookmarkId: string) => void
  addGroup: (group: BookmarkGroup) => void
  updateGroup: (id: string, group: Partial<BookmarkGroup>) => void
  deleteGroup: (id: string) => void
  reorderGroups: (groupIds: string[]) => void
  setSearchQuery: (query: string) => void
  setSelectedGroupId: (groupId: string | null) => void
  setSortBy: (sortBy: SortOption) => void
  setFilterBy: (filterBy: FilterOption) => void
  setBreadcrumbs: (breadcrumbs: { id: string | null; name: string }[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Internal helper to clear cache
  _clearFilterCache: () => void

  // Computed
  filteredBookmarks: () => Bookmark[]
  getBookmarksByGroup: (groupId: string) => Bookmark[]
  getGroupById: (groupId: string) => BookmarkGroup | undefined
  getSubgroups: (parentId: string | null) => BookmarkGroup[]
}

export const useBookmarkStore = create<BookmarkStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      bookmarks: [],
      groups: [],
      loading: false,
      error: null,
      searchQuery: '',
      selectedGroupId: null,
      sortBy: 'alphabetical' as SortOption,
      filterBy: 'all' as FilterOption,
      breadcrumbs: [{ id: null, name: 'Home' }],
      _filteredBookmarksCache: null,
      
      // Internal helper to clear cache
      _clearFilterCache: () => set({ _filteredBookmarksCache: null }),

      // Actions
      setBookmarks: (bookmarks) => set({
        bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
        _filteredBookmarksCache: null // Clear cache when bookmarks change
      }),
      setGroups: (groups) => set({
        groups: Array.isArray(groups) ? groups : [],
        _filteredBookmarksCache: null // Clear cache when groups change
      }),
      
      addBookmark: (bookmark) =>
        set((state) => ({
          bookmarks: [...state.bookmarks, bookmark],
          _filteredBookmarksCache: null
        })),
      
      updateBookmark: (id, updatedBookmark) =>
        set((state) => ({
          bookmarks: state.bookmarks.map((bookmark) =>
            bookmark.id === id ? { ...bookmark, ...updatedBookmark } : bookmark
          ),
          _filteredBookmarksCache: null
        })),
      
      deleteBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id),
          _filteredBookmarksCache: null
        })),
      
      incrementClickCount: (bookmarkId) =>
        set((state) => ({
          bookmarks: state.bookmarks.map((bookmark) =>
            bookmark.id === bookmarkId
              ? { ...bookmark, clickCount: bookmark.clickCount + 1, lastClicked: new Date() }
              : bookmark
          ),
          _filteredBookmarksCache: null
        })),
      
      addGroup: (group) =>
        set((state) => ({
          groups: [...state.groups, group]
        })),
      
      updateGroup: (id, updatedGroup) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, ...updatedGroup } : group
          )
        })),
      
      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id),
          selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId
        })),
      
      reorderGroups: (groupIds) =>
        set((state) => {
          const groupMap = new Map(state.groups.map(group => [group.id, group]))
          const reorderedGroups = groupIds.map(id => groupMap.get(id)!).filter(Boolean)
          const unorderedGroups = state.groups.filter(group => !groupIds.includes(group.id))
          return {
            groups: [...reorderedGroups, ...unorderedGroups]
          }
        }),
      
      setSearchQuery: (searchQuery) => set({ searchQuery, _filteredBookmarksCache: null }),
      setSelectedGroupId: (selectedGroupId) => set({ selectedGroupId, _filteredBookmarksCache: null }),
      setSortBy: (sortBy) => set({ sortBy, _filteredBookmarksCache: null }),
      setFilterBy: (filterBy) => set({ filterBy, _filteredBookmarksCache: null }),
      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      // Computed getters with memoization
      filteredBookmarks: () => {
        const state = get()
        const { bookmarks, groups, searchQuery, selectedGroupId, sortBy, filterBy, _filteredBookmarksCache } = state

        // Create cache key from relevant state
        const cacheKey = JSON.stringify({
          bookmarksLength: bookmarks.length,
          bookmarksIds: bookmarks.map(b => `${b.id}-${b.clickCount}-${b.updatedAt}`).join(','),
          groupsLength: groups.length,
          searchQuery,
          selectedGroupId,
          sortBy,
          filterBy
        })

        // Return cached result if key matches
        if (_filteredBookmarksCache && _filteredBookmarksCache.key === cacheKey) {
          return _filteredBookmarksCache.result
        }

        // Ensure bookmarks is an array
        if (!Array.isArray(bookmarks)) {
          console.warn('Bookmarks is not an array:', bookmarks)
          return []
        }

        let filtered = [...bookmarks] // Create a copy to avoid mutating state

        // Find the Documentation group ID (cache this lookup)
        const documentationGroup = groups.find(g => g.name === 'Documentation')
        const documentationGroupId = documentationGroup?.id

        if (selectedGroupId) {
          // If a specific group is selected, show only that group's bookmarks
          filtered = filtered.filter(bookmark => bookmark.groupId === selectedGroupId)
        } else {
          // If showing "All Bookmarks", exclude Documentation group
          if (documentationGroupId) {
            filtered = filtered.filter(bookmark => bookmark.groupId !== documentationGroupId)
          }
        }

        if (filterBy !== 'all') {
          filtered = filtered.filter(bookmark => bookmark.environment === filterBy)
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(bookmark =>
            bookmark.title.toLowerCase().includes(query) ||
            bookmark.url.toLowerCase().includes(query) ||
            bookmark.description?.toLowerCase().includes(query) ||
            bookmark.tags.some(tag => tag.toLowerCase().includes(query))
          )
        }

        // Sort bookmarks
        filtered.sort((a, b) => {
          switch (sortBy) {
            case 'alphabetical':
              return a.title.localeCompare(b.title)
            case 'mostClicked':
              return b.clickCount - a.clickCount
            case 'recent':
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            case 'oldest':
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            default:
              return 0
          }
        })

        // Cache the result
        set({ _filteredBookmarksCache: { key: cacheKey, result: filtered } })

        return filtered
      },
      
      getBookmarksByGroup: (groupId) => {
        const { bookmarks } = get()
        return bookmarks.filter(bookmark => bookmark.groupId === groupId)
      },
      
      getGroupById: (groupId) => {
        const { groups } = get()
        return groups.find(group => group.id === groupId)
      },
      
      getSubgroups: (parentId) => {
        const { groups } = get()
        return groups.filter(group => group.parentId === parentId)
      }
    }),
    {
      name: 'bookmark-store'
    }
  )
)