import { useState } from 'react'
import { Folder, FolderOpen, Hash, Plus, ChevronRight, ChevronDown, Edit2, Trash2, ChevronLeft, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useBookmarkStore, type BookmarkGroup } from '@/stores/useBookmarkStore'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { groupApi } from '@/services/api'

interface GroupSidebarProps {
  onAddGroup?: () => void
  onEditGroup?: (group: BookmarkGroup) => void
  onDeleteGroup?: (groupId: string) => void
}

interface GroupItemProps {
  group: BookmarkGroup
  level?: number
  isCollapsed?: boolean
  onEditGroup?: (group: BookmarkGroup) => void
  onDeleteGroup?: (groupId: string) => void
  isDragging?: boolean
  isDragOverlay?: boolean
}

interface SortableGroupItemProps extends GroupItemProps {
  id: string
}

function GroupItem({ group, level = 0, isCollapsed = false, onEditGroup, onDeleteGroup, isDragging = false, isDragOverlay = false }: GroupItemProps) {
  const { selectedGroupId, setSelectedGroupId, getBookmarksByGroup, getSubgroups } = useBookmarkStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showActions, setShowActions] = useState(false)
  
  const bookmarkCount = getBookmarksByGroup(group.id).length
  const subgroups = getSubgroups(group.id)
  const hasSubgroups = subgroups.length > 0
  const isSelected = selectedGroupId === group.id
  
  const handleGroupClick = () => {
    setSelectedGroupId(group.id)
  }
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEditGroup?.(group)
  }
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete group "${group.name}" and all its bookmarks?`)) {
      onDeleteGroup?.(group.id)
    }
  }
  
  return (
    <>
      <motion.div
        className={cn(
          "group flex items-center rounded-lg transition-all duration-300 relative border",
          isSelected
            ? "backdrop-blur-sm shadow-lg"
            : "hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100",
          isCollapsed && "justify-center",
          isDragging && "drag-ghost",
          isDragOverlay && "drag-overlay bg-white dark:bg-slate-800 border-emerald-500/50"
        )}
        style={{ 
          paddingLeft: isCollapsed ? '8px' : `${level * 12 + 12}px`,
          paddingRight: isCollapsed ? '8px' : undefined,
          backgroundColor: isSelected && group.color ? `${group.color}20` : undefined,
          borderColor: isSelected && group.color ? `${group.color}40` : 'transparent',
          color: isSelected && group.color ? group.color : undefined
        }}
        whileHover={{ scale: isDragging ? 1 : 1.01 }}
        whileTap={{ scale: isDragging ? 1 : 0.99 }}
        onMouseEnter={() => !isDragging && setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        title={isCollapsed ? `${group.name} (${bookmarkCount})` : undefined}
        animate={isDragging ? { scale: 0.95, opacity: 0.5 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Drag handle for top-level groups when not collapsed */}
        {level === 0 && !isCollapsed && !isDragOverlay && (
          <div className="flex-shrink-0 p-1 drag-handle opacity-40 hover:opacity-70 transition-opacity">
            <GripVertical className="h-3 w-3" />
          </div>
        )}
        
        {/* Expand/Collapse button - hide in collapsed sidebar */}
        {hasSubgroups && !isCollapsed && (
          <button
            onClick={handleToggleExpand}
            className="p-1 hover:bg-white/10 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        
        {/* Main group button */}
        <button
          onClick={handleGroupClick}
          className={cn(
            "flex items-center py-2 px-2 text-left",
            isCollapsed ? "justify-center" : "flex-1 space-x-2"
          )}
        >
          {isCollapsed ? (
            // Collapsed view - just show icon
            group.icon ? (
              <span className="text-base" style={{ color: group.color || undefined }}>
                {group.icon}
              </span>
            ) : (
              <Folder className="h-4 w-4" />
            )
          ) : (
            // Expanded view - show full details
            <>
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {group.icon ? (
                  <span className="text-base flex-shrink-0" style={{ color: group.color || undefined }}>
                    {group.icon}
                  </span>
                ) : isSelected ? (
                  <FolderOpen className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="text-sm font-medium truncate" style={{ color: isSelected && group.color ? group.color : undefined }}>
                  {group.name}
                </span>
              </div>
              <span className="text-xs opacity-70 flex-shrink-0">{bookmarkCount}</span>
            </>
          )}
        </button>
        
        {/* Actions menu */}
        {showActions && (onEditGroup || onDeleteGroup) && (
          <div className="absolute right-2 flex items-center space-x-1">
            <button
              onClick={handleEdit}
              className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit group"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete group"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </motion.div>
      
      {/* Subgroups */}
      <AnimatePresence>
        {isExpanded && hasSubgroups && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {subgroups.map((subgroup) => (
              <GroupItem
                key={subgroup.id}
                group={subgroup}
                level={level + 1}
                onEditGroup={onEditGroup}
                onDeleteGroup={onDeleteGroup}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function SortableGroupItem({ id, ...props }: SortableGroupItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} className="touch-none">
        <GroupItem {...props} isDragging={isDragging} />
      </div>
    </div>
  )
}

export function GroupSidebar({ onAddGroup, onEditGroup, onDeleteGroup }: GroupSidebarProps) {
  const { selectedGroupId, setSelectedGroupId, getSubgroups, reorderGroups } = useBookmarkStore()
  const bookmarks = useBookmarkStore((state) => state.bookmarks)
  const groups = useBookmarkStore((state) => state.groups)
  const { isCollapsed, toggleSidebar } = useSidebarStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedGroup, setDraggedGroup] = useState<BookmarkGroup | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // Calculate All Bookmarks count (excluding Documentation)
  const documentationGroup = groups.find(g => g.name === 'Documentation')
  const allBookmarksCount = bookmarks.filter(b => 
    b.groupId !== documentationGroup?.id
  ).length
  
  // Get only top-level groups (no parent)
  const topLevelGroups = getSubgroups(null)
  
  const handleDragStart = (event: any) => {
    const { active } = event
    setActiveId(active.id)
    const group = topLevelGroups.find(g => g.id === active.id)
    setDraggedGroup(group || null)
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = topLevelGroups.findIndex(group => group.id === active.id)
      const newIndex = topLevelGroups.findIndex(group => group.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(topLevelGroups, oldIndex, newIndex)
        const groupIds = newOrder.map(group => group.id)
        
        // Update local state immediately for smooth UX
        reorderGroups(groupIds)
        
        // Persist to backend
        try {
          const groupsWithOrder = newOrder.map((group, index) => ({
            id: group.id,
            sort_order: index
          }))
          await groupApi.reorderGroups(groupsWithOrder)
        } catch (error) {
          console.error('Failed to reorder groups:', error)
          // Could add toast notification here for error feedback
        }
      }
    }

    setActiveId(null)
    setDraggedGroup(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setDraggedGroup(null)
  }

  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isCollapsed ? 60 : 256,
        transition: { duration: 0.3, ease: 'easeInOut' }
      }}
      className={cn(
        "border-r-2 border-slate-200 dark:border-emerald-400/50",
        "bg-white/80 dark:bg-[#1a2332]/80 backdrop-blur-xl",
        "flex flex-col h-full relative overflow-hidden",
        isCollapsed ? "w-[60px]" : "w-64"
      )}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className={cn(
          "absolute top-4 z-20 h-7 w-7",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          "transition-all duration-300",
          isCollapsed ? "right-3" : "right-3"
        )}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-sm font-semibold text-foreground">Groups</h2>
            )}
            {!isCollapsed ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onAddGroup}
                className="h-7 w-7 hover:text-emerald-500 dark:hover:text-emerald-400"
                title="Add new group"
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={onAddGroup}
                className="h-7 w-7 hover:text-emerald-500 dark:hover:text-emerald-400 mx-auto"
                title="Add new group"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* All Bookmarks */}
          <motion.button
            onClick={() => setSelectedGroupId(null)}
            className={cn(
              "w-full flex items-center rounded-lg text-left transition-all duration-300 border",
              selectedGroupId === null
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 backdrop-blur-sm shadow-lg shadow-emerald-500/10"
                : "hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 border-transparent",
              isCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2 space-x-3"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={isCollapsed ? `All Bookmarks (${allBookmarksCount})` : undefined}
          >
            <Hash className="h-4 w-4" />
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">All Bookmarks</div>
                </div>
                <div className="text-xs opacity-70">{allBookmarksCount}</div>
              </>
            )}
          </motion.button>

          {/* Groups List */}
          <div className="space-y-1">
            {topLevelGroups.length === 0 ? (
              <div className="text-center py-8">
                <Folder className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No groups yet</p>
                <Button variant="outline" size="sm" onClick={onAddGroup}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={topLevelGroups.map(g => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {topLevelGroups.map((group) => (
                      <SortableGroupItem
                        key={group.id}
                        id={group.id}
                        group={group}
                        isCollapsed={isCollapsed}
                        onEditGroup={onEditGroup}
                        onDeleteGroup={onDeleteGroup}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeId && draggedGroup ? (
                    <GroupItem
                      group={draggedGroup}
                      isCollapsed={isCollapsed}
                      onEditGroup={onEditGroup}
                      onDeleteGroup={onDeleteGroup}
                      isDragOverlay={true}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* Footer with Connection Status and Version */}
      <div className="border-t">
        <div className={cn("p-4", isCollapsed ? "text-center" : "space-y-2")}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Connected</span>
              </div>
              
              {/* Version Link */}
              <a
                href="/version"
                onClick={(e) => {
                  e.preventDefault()
                  window.open('/version', '_blank')
                }}
                className="flex items-center space-x-2 text-xs text-muted-foreground hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <span>v1.2.0</span>
                <span className="text-[10px]">• View changelog</span>
              </a>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mx-auto mb-2" title="Connected" />
              <a
                href="/version"
                onClick={(e) => {
                  e.preventDefault()
                  window.open('/version', '_blank')
                }}
                className="text-xs text-muted-foreground hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                title="Version 1.2.0 - View changelog"
              >
                v1.2
              </a>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  )
}