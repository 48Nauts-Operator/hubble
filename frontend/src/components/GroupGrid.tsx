// ABOUTME: Responsive grid component for displaying bookmark groups
// ABOUTME: Supports nested subgroups, click navigation, and hover animations with empty state
import { motion, AnimatePresence } from 'framer-motion'
import { GroupCard } from '@/components/GroupCard'
import type { BookmarkGroup } from '@/stores/useBookmarkStore'
import { useBookmarkStore } from '@/stores/useBookmarkStore'

interface GroupGridProps {
  groups: BookmarkGroup[]
  selectedGroupId?: string | null
  onGroupClick?: (group: BookmarkGroup) => void
  onEditGroup?: (group: BookmarkGroup) => void
  onDeleteGroup?: (groupId: string) => void
}

export function GroupGrid({ 
  groups, 
  selectedGroupId,
  onGroupClick, 
  onEditGroup, 
  onDeleteGroup 
}: GroupGridProps) {
  const { getBookmarksByGroup, getSubgroups } = useBookmarkStore()

  if (groups.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-6"
          animate={{ 
            y: [0, -5, 0],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg
            className="w-10 h-10 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2"
            />
          </svg>
        </motion.div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">No groups found</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Create your first group to organize your bookmarks into categories. Groups help you keep your bookmarks organized and easy to find.
        </p>
        
        <motion.div 
          className="text-sm text-muted-foreground/70"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Use the sidebar to create your first group
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      <AnimatePresence mode="popLayout">
        {groups.map((group, index) => {
          const bookmarkCount = getBookmarksByGroup(group.id).length
          const subgroupCount = getSubgroups(group.id).length
          const isSelected = selectedGroupId === group.id

          return (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                transition: { 
                  delay: index * 0.05,
                  duration: 0.3,
                  ease: "easeOut"
                }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8, 
                y: -20,
                transition: { duration: 0.2 }
              }}
            >
              <GroupCard
                group={group}
                bookmarkCount={bookmarkCount}
                subgroupCount={subgroupCount}
                isSelected={isSelected}
                onClick={onGroupClick}
                onEdit={onEditGroup}
                onDelete={onDeleteGroup}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}