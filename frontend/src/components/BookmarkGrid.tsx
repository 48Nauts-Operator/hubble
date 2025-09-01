// ABOUTME: Enhanced grid layout component for displaying bookmark cards with sorting and filtering
// ABOUTME: Features responsive columns, empty state, and control panel for organizing bookmarks
import { motion } from 'framer-motion'
import { ArrowUpDown, Filter, RotateCcw } from 'lucide-react'
import { BookmarkCard } from '@/components/BookmarkCard'
import { Button } from '@/components/ui/Button'
import type { Bookmark, SortOption, FilterOption } from '@/stores/useBookmarkStore'
import { useBookmarkStore } from '@/stores/useBookmarkStore'
import { cn } from '@/utils/cn'

interface BookmarkGridProps {
  bookmarks: Bookmark[]
  onEditBookmark?: (bookmark: Bookmark) => void
  onDeleteBookmark?: (id: string) => void
  showControls?: boolean
  className?: string
}

export function BookmarkGrid({ 
  bookmarks, 
  onEditBookmark, 
  onDeleteBookmark,
  showControls = true,
  className
}: BookmarkGridProps) {
  const { sortBy, setSortBy, filterBy, setFilterBy } = useBookmarkStore()
  
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'mostClicked', label: 'Most Clicked' },
    { value: 'recent', label: 'Recently Added' },
    { value: 'oldest', label: 'Oldest First' }
  ]
  
  const filterOptions: { value: FilterOption; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'production', label: 'Production' },
    { value: 'staging', label: 'Staging' },
    { value: 'uat', label: 'UAT' },
    { value: 'development', label: 'Development' },
    { value: 'local', label: 'Local' }
  ]
  
  const handleReset = () => {
    setSortBy('alphabetical')
    setFilterBy('all')
  }

  if (bookmarks.length === 0) {
    const hasActiveFilters = sortBy !== 'alphabetical' || filterBy !== 'all'
    
    return (
      <div className={cn("space-y-6", className)}>
        {showControls && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">No results</span>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-8"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        )}
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <motion.div 
            className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {hasActiveFilters ? 'No bookmarks match your filters' : 'No bookmarks found'}
          </h3>
          <p className="text-muted-foreground max-w-md mb-4">
            {hasActiveFilters 
              ? 'Try adjusting your filters or search terms to find more bookmarks.'
              : 'Start by adding your first bookmark or try adjusting your search terms.'
            }
          </p>
          
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Controls */}
      {showControls && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/50"
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sort:</span>
              <div className="flex space-x-1">
                {sortOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy(option.value)}
                    className="h-8 text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
              <div className="flex space-x-1">
                {filterOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filterBy === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterBy(option.value)}
                    className="h-8 text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {bookmarks.map((bookmark) => (
          <BookmarkCard
            key={bookmark.id}
            bookmark={bookmark}
            onEdit={onEditBookmark}
            onDelete={onDeleteBookmark}
            className="w-full"
          />
        ))}
      </div>
    </div>
  )
}