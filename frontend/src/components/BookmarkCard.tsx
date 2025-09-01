// ABOUTME: Interactive bookmark card component with flip animation and favicon support
// ABOUTME: Features minimal front design with detailed back view and uniform sizing
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  MoreVertical,
  Edit2, 
  Trash2, 
  Globe, 
  Eye,
  MousePointer
} from 'lucide-react'
import { useBookmarkStore, type Bookmark } from '@/stores/useBookmarkStore'
import { cn } from '@/utils/cn'
import { getEnhancedFaviconUrl, getBrandGradient, getBrandColors } from '@/utils/brandDetection'

interface BookmarkCardProps {
  bookmark: Bookmark
  onEdit?: (bookmark: Bookmark) => void
  onDelete?: (id: string) => void
  className?: string
}

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  className
}: BookmarkCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  
  // Get the group color if bookmark belongs to a group
  const groups = useBookmarkStore((state) => state.groups)
  const bookmarkGroup = groups.find(g => g.id === bookmark.groupId)
  const groupColor = bookmarkGroup?.color
  
  // Determine which URL to use - ALWAYS prefer external/FQDN over internal/localhost
  // Priority: externalUrl (FQDN) > url > internalUrl (localhost)
  const currentUrl = bookmark.externalUrl || bookmark.url || bookmark.internalUrl || ''
    
  // Get enhanced favicon with brand detection
  const faviconUrl = bookmark.icon && !bookmark.icon.includes('://') 
    ? null 
    : getEnhancedFaviconUrl(bookmark.url, bookmark.title)
  
  // Get brand colors for styling
  const brandColors = getBrandColors(bookmark.url, bookmark.title)
  const brandGradient = getBrandGradient(bookmark.url, bookmark.title, document.documentElement.classList.contains('dark'))
  
  const getEnvironmentColor = (env: string) => {
    switch (env?.toLowerCase()) {
      case 'production':
      case 'prod':
        return 'from-red-500/10 to-transparent'
      case 'staging':
      case 'uat':
        return 'from-yellow-500/10 to-transparent'
      case 'development':
      case 'dev':
        return 'from-blue-500/10 to-transparent'
      case 'local':
        return 'from-green-500/10 to-transparent'
      default:
        return ''
    }
  }
  
  const getEnvironmentShort = (env: string) => {
    switch (env?.toLowerCase()) {
      case 'production': return 'PRD'
      case 'staging': return 'STG'
      case 'uat': return 'UAT'
      case 'development': return 'DEV'
      case 'local': return 'LOC'
      default: return env?.substring(0, 3).toUpperCase() || ''
    }
  }
  
  const formatClickCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open link if clicking on action buttons or if card is flipped
    if ((e.target as HTMLElement).closest('.action-button') || isFlipped) {
      return
    }
    window.open(currentUrl, '_blank')
  }
  
  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFlipped(!isFlipped)
  }
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDropdown(false)
    onEdit?.(bookmark)
  }
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDropdown(false)
    if (confirm(`Delete "${bookmark.title}"?`)) {
      onDelete?.(bookmark.id)
    }
  }
  
    
  return (
    <motion.div
      className={cn(
        "relative h-48 w-full",
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        className="relative h-full w-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front of card */}
        <Card 
          className={cn(
            "absolute inset-0 h-full w-full cursor-pointer overflow-hidden",
            "bg-white/90 dark:bg-[#1f2937]/80 backdrop-blur-xl",
            "border-2 border-slate-200/50 dark:border-emerald-400/50",
            brandColors.primary 
              ? "hover:shadow-lg" 
              : "hover:shadow-lg hover:shadow-emerald-500/10",
            brandColors.primary
              ? "hover:border-current"
              : "hover:border-emerald-500/30",
            "transition-all duration-300",
            bookmark.environment && `bg-gradient-to-br ${getEnvironmentColor(bookmark.environment)}`,
            "[backface-visibility:hidden]"
          )}
          onClick={handleCardClick}
          style={{ 
            backfaceVisibility: "hidden",
            background: groupColor 
              ? `linear-gradient(135deg, ${groupColor}15 0%, transparent 100%)` 
              : brandGradient ? `${brandGradient}, var(--tw-bg-opacity)` : undefined,
            borderColor: groupColor ? `${groupColor}40` : brandColors.primary ? `${brandColors.primary}30` : undefined
          }}
        >
        <CardHeader className="h-full flex flex-col justify-between p-4">
          {/* Top section with title and actions */}
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Favicon or Icon */}
                <div className="relative flex-shrink-0">
                  {bookmark.icon && !bookmark.icon.includes('://') ? (
                    <div className="w-8 h-8 text-xl flex items-center justify-center">
                      {bookmark.icon}
                    </div>
                  ) : faviconUrl ? (
                    <img
                      src={faviconUrl}
                      alt=""
                      className="w-8 h-8 object-contain rounded"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.style.display = 'none'
                        const fallback = document.createElement('div')
                        fallback.className = 'w-8 h-8 flex items-center justify-center'
                        fallback.innerHTML = '<svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>'
                        img.parentElement?.appendChild(fallback)
                      }}
                    />
                  ) : (
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                
                {/* Title - clickable */}
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => window.open(currentUrl, '_blank')}>
                  <CardTitle className="text-base font-semibold leading-tight line-clamp-1 hover:text-primary transition-colors flex items-center space-x-2">
                    <span>{bookmark.title}</span>
                    {/* Show group icon if available */}
                    {bookmarkGroup?.icon && (
                      <span className="text-sm opacity-60" title={bookmarkGroup.name}>
                        {bookmarkGroup.icon}
                      </span>
                    )}
                  </CardTitle>
                </div>
              </div>
              
              {/* 3-dot menu for edit/delete */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 action-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDropdown(!showDropdown)
                  }}
                  title="More actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                
                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute right-0 top-full mt-1 w-40 rounded-md bg-popover border border-border shadow-lg z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            className="w-full justify-start px-3 py-2 text-sm hover:bg-muted"
                            onClick={handleEdit}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            className="w-full justify-start px-3 py-2 text-sm hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleDelete}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* URL */}
            <div className="text-xs text-muted-foreground/70 mb-2">
              {(() => {
                try {
                  return currentUrl ? new URL(currentUrl).hostname : ''
                } catch {
                  return currentUrl || ''
                }
              })()}
            </div>
            
            {/* Description - MAIN CONTENT ON FRONT */}
            {bookmark.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {bookmark.description}
              </p>
            )}
          </div>
          
          {/* Bottom section with info button and environment */}
          <div className="flex items-end justify-between">
            <div className="flex items-center space-x-2">
              {/* Group badge with icon and color */}
              {bookmarkGroup && (
                <div 
                  className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: groupColor ? `${groupColor}20` : 'rgb(52 211 153 / 0.1)',
                    color: groupColor || 'rgb(52 211 153)',
                    borderWidth: '1px',
                    borderColor: groupColor ? `${groupColor}40` : 'rgb(52 211 153 / 0.3)'
                  }}
                >
                  {bookmarkGroup.icon && <span>{bookmarkGroup.icon}</span>}
                  <span>{bookmarkGroup.name}</span>
                </div>
              )}
              {/* Environment badge - subtle */}
              {bookmark.environment && (
                <span className="text-xs font-medium text-muted-foreground/60">
                  {getEnvironmentShort(bookmark.environment)}
                </span>
              )}
              {bookmark.clickCount > 0 && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground/50">
                  <MousePointer className="h-3 w-3" />
                  <span>{formatClickCount(bookmark.clickCount)}</span>
                </div>
              )}
            </div>
            
            {/* Info button to flip card */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 action-button"
              onClick={handleFlip}
              title="More info"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        </Card>
        
        {/* Back of card */}
        <Card 
          className={cn(
            "absolute inset-0 h-full w-full overflow-hidden",
            "bg-white/90 dark:bg-[#1f2937]/80 backdrop-blur-xl",
            "border-2 border-slate-200/50 dark:border-emerald-400/50",
            brandColors.primary 
              ? "hover:shadow-lg" 
              : "hover:shadow-lg hover:shadow-emerald-500/10",
            brandColors.primary
              ? "hover:border-current"
              : "hover:border-emerald-500/30",
            "transition-all duration-300",
            bookmark.environment && `bg-gradient-to-br ${getEnvironmentColor(bookmark.environment)}`,
            "[transform:rotateY(180deg)] [backface-visibility:hidden]"
          )}
          style={{ 
            transform: "rotateY(180deg)", 
            backfaceVisibility: "hidden",
            background: groupColor 
              ? `linear-gradient(135deg, ${groupColor}15 0%, transparent 100%)` 
              : brandGradient ? `${brandGradient}, var(--tw-bg-opacity)` : undefined,
            borderColor: groupColor ? `${groupColor}40` : brandColors.primary ? `${brandColors.primary}30` : undefined
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle 
                className="text-sm font-semibold cursor-pointer hover:text-primary transition-colors"
                onClick={() => window.open(currentUrl, '_blank')}
              >
                {bookmark.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 action-button"
                onClick={handleFlip}
                title="Back to front"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Full URLs - less important, on back */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">External:</span> {bookmark.url}
              </div>
              {bookmark.internalUrl && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Internal:</span> {bookmark.internalUrl}
                </div>
              )}
            </div>
            
            {/* Tags */}
            {bookmark.tags && bookmark.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {bookmark.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: brandColors.primary ? `${brandColors.primary}15` : 'rgb(52 211 153 / 0.1)',
                      color: brandColors.primary || 'rgb(52 211 153)',
                      borderWidth: '1px',
                      borderColor: brandColors.primary ? `${brandColors.primary}30` : 'rgb(52 211 153 / 0.3)'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}