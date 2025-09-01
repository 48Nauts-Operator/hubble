// ABOUTME: Individual group card component with icon, name, description and bookmark count
// ABOUTME: Features hover animations, custom colors, and click navigation support
import { Folder, FolderOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { BookmarkGroup } from '@/stores/useBookmarkStore'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface GroupCardProps {
  group: BookmarkGroup
  bookmarkCount: number
  subgroupCount?: number
  isSelected?: boolean
  onClick?: (group: BookmarkGroup) => void
  onEdit?: (group: BookmarkGroup) => void
  onDelete?: (groupId: string) => void
}

export function GroupCard({ 
  group, 
  bookmarkCount, 
  subgroupCount = 0,
  isSelected = false,
  onClick, 
  onEdit, 
  onDelete 
}: GroupCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).closest('.card-content')) {
      onClick?.(group)
    }
  }

  const renderIcon = () => {
    if (group.icon) {
      // Handle emoji or custom icon
      if (group.icon.length <= 4) {
        return (
          <div className="text-2xl w-10 h-10 flex items-center justify-center">
            {group.icon}
          </div>
        )
      }
      // Custom icon URL
      return (
        <img
          src={group.icon}
          alt={group.name}
          className="w-10 h-10 rounded-lg object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      )
    }
    
    return isSelected ? (
      <FolderOpen className="h-10 w-10 text-primary" />
    ) : (
      <Folder className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "group h-full cursor-pointer hover:shadow-xl transition-all duration-300 border-2",
          isSelected 
            ? "border-primary shadow-lg bg-primary/5" 
            : "hover:border-primary/20 hover:bg-accent/5"
        )}
        onClick={handleCardClick}
        style={group.color ? { 
          borderColor: isSelected ? group.color : undefined,
          backgroundColor: isSelected ? `${group.color}10` : undefined
        } : undefined}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1 min-w-0 card-content">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                {renderIcon()}
              </motion.div>
              
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg font-semibold leading-6 line-clamp-2 group-hover:text-primary transition-colors">
                  {group.name}
                </CardTitle>
                {group.description && (
                  <CardDescription className="text-sm mt-1 line-clamp-2">
                    {group.description}
                  </CardDescription>
                )}
              </div>
            </div>
            
            {(onEdit || onDelete) && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 ml-2">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(group)
                    }}
                    className="h-8 w-8"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(group.id)
                    }}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M10 12h4" />
                </svg>
                {bookmarkCount}
              </span>
              
              {subgroupCount > 0 && (
                <span className="flex items-center">
                  <Folder className="h-4 w-4 mr-1" />
                  {subgroupCount}
                </span>
              )}
            </div>
            
            <motion.div
              className="text-xs opacity-70"
              whileHover={{ opacity: 1 }}
            >
              Click to open
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}