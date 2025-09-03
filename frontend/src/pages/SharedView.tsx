// ABOUTME: SharedView page - Public view interface for accessing shared bookmark collections
// ABOUTME: Displays bookmarks from a shared link with optional personal overlay support

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Globe, 
  Lock, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Search,
  Grid,
  List,
  Moon,
  Sun
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { shareApi } from '@/services/shareApi'
import { stripHtml } from '@/utils/sanitize'

interface SharedBookmark {
  id: string
  title: string
  url: string
  description?: string
  icon?: string
  environment?: string
  tags?: string[]
  group?: {
    id: string
    name: string
    color?: string
  }
}

interface SharedViewData {
  uid: string
  name: string
  description?: string
  isPublic: boolean
  permissions: {
    canAdd: boolean
    canEdit: boolean
    canDelete: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    title?: string
    description?: string
    showDescription: boolean
    showTags: boolean
    showEnvironment: boolean
  }
  bookmarks: SharedBookmark[]
  groups: Array<{
    id: string
    name: string
    color?: string
    bookmarkCount: number
  }>
  expiresAt?: Date
  createdBy?: string
}

export function SharedView() {
  const { uid } = useParams<{ uid: string }>()
  const [viewData, setViewData] = useState<SharedViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (uid) {
      loadSharedView()
    }
  }, [uid])

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const loadSharedView = async () => {
    if (!uid) return

    try {
      setLoading(true)
      setError(null)
      
      // Get shared view data from public endpoint
      const response = await shareApi.getPublicShare(uid)
      
      // Transform the response
      const share = response.share
      const transformedData: SharedViewData = {
        uid: share.uid,
        name: share.name,
        description: share.description,
        isPublic: share.access_type === 'public',
        permissions: {
          canAdd: share.permissions?.canAddBookmarks || false,
          canEdit: share.permissions?.canEditBookmarks || false,
          canDelete: share.permissions?.canDeleteBookmarks || false
        },
        appearance: {
          theme: share.theme || 'system',
          title: share.branding?.title || share.name,
          description: share.branding?.subtitle || share.description,
          showDescription: share.show_description !== false,
          showTags: share.show_tags !== false,
          showEnvironment: share.show_environment !== false
        },
        bookmarks: (response.bookmarks || []).map((bookmark: any) => ({
          ...bookmark,
          tags: typeof bookmark.tags === 'string' ? JSON.parse(bookmark.tags || '[]') : (bookmark.tags || []),
          group: bookmark.group_name ? {
            id: bookmark.group_id,
            name: bookmark.group_name,
            color: bookmark.group_color
          } : undefined
        })),
        groups: response.groups || [],
        expiresAt: share.expires_at ? new Date(share.expires_at) : undefined,
        createdBy: share.created_by
      }

      setViewData(transformedData)
      
      // Set initial theme based on share settings
      if (transformedData.appearance.theme === 'dark') {
        setTheme('dark')
      } else if (transformedData.appearance.theme === 'light') {
        setTheme('light')
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setTheme(prefersDark ? 'dark' : 'light')
      }
      
    } catch (err: any) {
      console.error('Error loading shared view:', err)
      if (err.status === 404) {
        setError('This shared view does not exist or has been removed.')
      } else if (err.status === 410) {
        setError('This shared view has expired.')
      } else if (err.status === 429) {
        setError('This shared view has reached its maximum number of uses.')
      } else {
        setError(err.message || 'Failed to load shared view')
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredBookmarks = viewData?.bookmarks.filter(bookmark => {
    const matchesSearch = !searchQuery || 
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesGroup = !selectedGroup || bookmark.group?.id === selectedGroup
    
    return matchesSearch && matchesGroup
  }) || []

  const handleBookmarkClick = (bookmark: SharedBookmark) => {
    // Track click if we have an API endpoint for it
    // For now, just open the URL
    window.open(bookmark.url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shared view...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Load Share</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (!viewData) {
    return null
  }

  const isExpired = viewData.expiresAt && viewData.expiresAt < new Date()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {viewData.isPublic ? (
                <Globe className="h-6 w-6 text-green-500" />
              ) : (
                <Lock className="h-6 w-6 text-yellow-500" />
              )}
              <div>
                <h1 className="text-xl font-bold">
                  {viewData.appearance.title || viewData.name}
                </h1>
                {viewData.appearance.showDescription && viewData.appearance.description && (
                  <p className="text-sm text-muted-foreground">
                    {viewData.appearance.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {/* View Mode Toggle */}
              <div className="flex border border-border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Expired Warning */}
      {isExpired && (
        <div className="bg-yellow-500/20 border-b border-yellow-400/50 px-4 py-2">
          <div className="container mx-auto flex items-center gap-2 text-yellow-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">This shared view has expired</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Group Filter */}
          {viewData.groups.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={!selectedGroup ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedGroup(null)}
              >
                All Groups
              </Button>
              {viewData.groups.map(group => (
                <Button
                  key={group.id}
                  variant={selectedGroup === group.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGroup(group.id)}
                  style={{
                    borderColor: selectedGroup === group.id ? group.color : undefined,
                    backgroundColor: selectedGroup === group.id ? group.color : undefined
                  }}
                >
                  {group.name} ({group.bookmarkCount})
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Bookmarks */}
        {filteredBookmarks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No bookmarks found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search query' : 'This shared view has no bookmarks yet'}
            </p>
          </motion.div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-4'
          }>
            {filteredBookmarks.map((bookmark, index) => (
              <motion.div
                key={bookmark.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => handleBookmarkClick(bookmark)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0">
                        {bookmark.icon || '🔗'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 truncate">
                          {bookmark.title}
                        </h3>
                        
                        {viewData.appearance.showDescription && bookmark.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {stripHtml(bookmark.description)}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate">{bookmark.url}</span>
                        </div>

                        {/* Tags and Environment */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {viewData.appearance.showEnvironment && bookmark.environment && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                              {bookmark.environment}
                            </span>
                          )}
                          
                          {viewData.appearance.showTags && bookmark.tags?.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}

                          {bookmark.group && (
                            <span
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{
                                backgroundColor: `${bookmark.group.color}20`,
                                color: bookmark.group.color
                              }}
                            >
                              {bookmark.group.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Shared by {viewData.createdBy || 'Anonymous'} • 
          Powered by Hubble
        </div>
      </footer>
    </div>
  )
}