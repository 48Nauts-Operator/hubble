// ABOUTME: List view component for bookmarks with compact rows
// ABOUTME: Alternative to card view for better information density

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import {
  Edit2,
  Trash2,
  ExternalLink,
  Globe,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle
} from 'lucide-react'
import { useBookmarkStore, type Bookmark } from '@/stores/useBookmarkStore'
import { cn } from '@/utils/cn'
import { getEnhancedFaviconUrl, getBrandColors } from '@/utils/brandDetection'

interface BookmarkListProps {
  bookmarks: Bookmark[]
  onEditBookmark?: (bookmark: Bookmark) => void
  onDeleteBookmark?: (id: string) => void
  className?: string
}

interface BookmarkRowProps {
  bookmark: Bookmark
  onEdit?: (bookmark: Bookmark) => void
  onDelete?: (id: string) => void
}

function BookmarkRow({ bookmark, onEdit, onDelete }: BookmarkRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const groups = useBookmarkStore((state) => state.groups)
  const bookmarkGroup = groups.find(g => g.id === bookmark.groupId)
  const groupColor = bookmarkGroup?.color
  
  const currentUrl = bookmark.internalUrl || bookmark.externalUrl || bookmark.url
  
  const faviconUrl = bookmark.icon && !bookmark.icon.includes('://') 
    ? null 
    : getEnhancedFaviconUrl(bookmark.url, bookmark.title)
    
  const brandColors = getBrandColors(bookmark.url, bookmark.title)
  
  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(bookmark)
  }
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete "${bookmark.title}"?`)) {
      onDelete?.(bookmark.id)
    }
  }
  
  const handleOpenUrl = () => {
    window.open(currentUrl, '_blank')
  }
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "group border rounded-lg overflow-hidden transition-all duration-200",
        "bg-white/90 dark:bg-[#1f2937]/80 backdrop-blur-xl",
        "border-slate-200/50 dark:border-emerald-400/30",
        "hover:shadow-md hover:border-emerald-500/40"
      )}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: groupColor || brandColors.primary || 'rgb(52 211 153 / 0.5)'
      }}
    >
      {/* Main Row */}
      <div 
        className="flex items-center px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand Icon */}
        <button className="mr-3 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        
        {/* Favicon */}
        <div className="mr-3 flex-shrink-0">
          {bookmark.icon && !bookmark.icon.includes('://') ? (
            <span className="text-xl">{bookmark.icon}</span>
          ) : faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="w-5 h-5 object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement
                img.style.display = 'none'
              }}
            />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        
        {/* Title */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate hover:text-primary">
            {bookmark.title}
          </h3>
        </div>
        
        {/* URL Preview */}
        <div className="hidden md:block max-w-xs mx-4">
          <p className="text-xs text-muted-foreground truncate">
            {(() => {
              try {
                return new URL(currentUrl).hostname
              } catch {
                return currentUrl
              }
            })()}
          </p>
        </div>
        
        {/* Group Badge */}
        {bookmarkGroup && (
          <div 
            className="mr-3 px-2 py-1 rounded-md text-xs font-medium hidden sm:flex items-center space-x-1"
            style={{
              backgroundColor: groupColor ? `${groupColor}20` : 'rgb(52 211 153 / 0.1)',
              color: groupColor || 'rgb(52 211 153)'
            }}
          >
            {bookmarkGroup.icon && <span>{bookmarkGroup.icon}</span>}
            <span>{bookmarkGroup.name}</span>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleOpenUrl}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopyUrl}
            title="Copy URL"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
              title="Edit bookmark"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:text-destructive"
              onClick={handleDelete}
              title="Delete bookmark"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-200 dark:border-slate-700"
          >
            <div className="px-4 py-3 space-y-2">
              {/* Description */}
              {bookmark.description && (
                <p className="text-sm text-muted-foreground">
                  {bookmark.description}
                </p>
              )}
              
              {/* Full URL */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <span className="font-medium">URL:</span> {bookmark.url}
                </div>
                {bookmark.internalUrl && (
                  <div>
                    <span className="font-medium">Internal:</span> {bookmark.internalUrl}
                  </div>
                )}
              </div>
              
              {/* Tags */}
              {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {bookmark.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: brandColors.primary ? `${brandColors.primary}15` : 'rgb(52 211 153 / 0.1)',
                        color: brandColors.primary || 'rgb(52 211 153)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Environment */}
              {bookmark.environment && (
                <div className="text-xs">
                  <span className="font-medium">Environment:</span>{' '}
                  <span className="uppercase">{bookmark.environment}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function BookmarkList({ bookmarks, onEditBookmark, onDeleteBookmark, className }: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No bookmarks yet</h3>
        <p className="text-muted-foreground">
          Add your first bookmark to get started
        </p>
      </div>
    )
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence mode="popLayout">
        {bookmarks.map((bookmark) => (
          <BookmarkRow
            key={bookmark.id}
            bookmark={bookmark}
            onEdit={onEditBookmark}
            onDelete={onDeleteBookmark}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}