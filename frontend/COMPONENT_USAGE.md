# Hubble Frontend Component Usage Guide

This guide demonstrates how to use the enhanced UI components in the Hubble frontend application.

## Components Overview

### 1. GroupCard Component
**File**: `/src/components/GroupCard.tsx`

Individual group card with icon, name, description, and bookmark count. Features hover animations, custom colors, and click navigation.

```typescript
import { GroupCard } from '@/components/GroupCard'

<GroupCard
  group={group}                    // BookmarkGroup object
  bookmarkCount={15}               // Number of bookmarks in group
  subgroupCount={3}                // Number of subgroups (optional)
  isSelected={false}               // Whether group is currently selected
  onClick={(group) => {}}          // Callback when group is clicked
  onEdit={(group) => {}}           // Callback for edit action (optional)
  onDelete={(groupId) => {}}       // Callback for delete action (optional)
/>
```

**Features**:
- Emoji/icon support (`group.icon`)
- Custom color support (`group.color`)
- Hover animations with scale and rotation
- Click-to-navigate functionality
- Edit/Delete actions on hover

### 2. GroupGrid Component
**File**: `/src/components/GroupGrid.tsx`

Responsive grid for displaying bookmark groups with empty state and staggered animations.

```typescript
import { GroupGrid } from '@/components/GroupGrid'

<GroupGrid
  groups={groups}                  // Array of BookmarkGroup objects
  selectedGroupId={null}           // Currently selected group ID (optional)
  onGroupClick={(group) => {}}     // Callback when group is clicked
  onEditGroup={(group) => {}}      // Callback for edit action (optional)
  onDeleteGroup={(groupId) => {}}  // Callback for delete action (optional)
/>
```

**Features**:
- Responsive grid (1 to 5 columns based on screen size)
- Empty state with animated illustration
- Staggered entrance animations
- Nested subgroup support
- Click navigation with breadcrumbs

### 3. BreadcrumbNavigation Component
**File**: `/src/components/BreadcrumbNavigation.tsx`

Hierarchical breadcrumb navigation for group navigation with clickable navigation back to parent levels.

```typescript
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation'

<BreadcrumbNavigation
  breadcrumbs={breadcrumbs}        // Array of { id: string | null, name: string }
  onNavigate={(id) => {}}          // Callback when breadcrumb is clicked
  className="mb-4"                 // Optional CSS classes
/>
```

**Features**:
- Home icon for root level
- Responsive truncation on mobile
- Animated enter/exit transitions
- Click navigation to any parent level
- Automatic path management

### 4. SearchBar Component (Enhanced)
**File**: `/src/components/SearchBar.tsx`

Enhanced search with real-time suggestions, debouncing, and keyboard shortcuts.

```typescript
import { SearchBar } from '@/components/SearchBar'

<SearchBar
  value={searchQuery}                    // Current search value
  onChange={(value) => {}}               // Callback when value changes
  placeholder="Search bookmarks..."      // Placeholder text (optional)
  className="max-w-md"                   // Optional CSS classes
  showSuggestions={true}                 // Show search suggestions (default: true)
/>
```

**Features**:
- Real-time search with 150ms debouncing
- Suggestions dropdown (bookmarks, tags, groups)
- Keyboard navigation (Arrow keys, Enter, Escape)
- CMD/Ctrl+K shortcut to focus
- Clear button when value is present

### 5. BookmarkCard Component (Enhanced)
**File**: `/src/components/BookmarkCard.tsx`

Enhanced bookmark card with environment badges, health status, click tracking, and improved animations.

```typescript
import { BookmarkCard } from '@/components/BookmarkCard'

<BookmarkCard
  bookmark={bookmark}              // Bookmark object with new properties
  onEdit={(bookmark) => {}}        // Callback for edit action (optional)
  onDelete={(id) => {}}            // Callback for delete action (optional)
  showEnvironment={true}           // Show environment badge (default: true)
  showHealthStatus={true}          // Show health status dot (default: true)
  showClickCount={true}            // Show click counter (default: true)
/>
```

**New Properties**:
- `bookmark.environment`: 'dev' | 'staging' | 'prod' | 'local'
- `bookmark.healthStatus`: 'healthy' | 'degraded' | 'down' | 'unknown'
- `bookmark.clickCount`: number
- `bookmark.lastClicked`: Date
- `bookmark.icon`: string (emoji or custom icon)

**Features**:
- Environment badges with color coding
- Health status indicators (colored dots)
- Click count display with formatting (1k, 2.5k)
- Automatic favicon fetching with fallback
- Improved hover animations
- Click tracking (increments on link open)

### 6. BookmarkGrid Component (Enhanced)
**File**: `/src/components/BookmarkGrid.tsx`

Enhanced grid with sorting, filtering, and improved empty states.

```typescript
import { BookmarkGrid } from '@/components/BookmarkGrid'

<BookmarkGrid
  bookmarks={bookmarks}            // Array of Bookmark objects
  onEditBookmark={(bookmark) => {}} // Callback for edit action (optional)
  onDeleteBookmark={(id) => {}}    // Callback for delete action (optional)
  showControls={true}              // Show sorting/filtering controls (default: true)
  className="custom-class"         // Optional CSS classes
/>
```

**Features**:
- Sorting options: Alphabetical, Most Clicked, Recent, Oldest
- Environment filtering: All, Production, Staging, Development, Local
- Smart empty states with filter reset
- Responsive grid (1 to 5 columns)
- Staggered entrance animations
- Bookmark count display

## Store Enhancements

### Updated BookmarkStore
**File**: `/src/stores/useBookmarkStore.ts`

New state properties and actions:

```typescript
// New Types
export type Environment = 'dev' | 'staging' | 'prod' | 'local'
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown'
export type SortOption = 'alphabetical' | 'mostClicked' | 'recent' | 'oldest'
export type FilterOption = 'all' | 'dev' | 'staging' | 'prod' | 'local'

// Enhanced Bookmark interface
interface Bookmark {
  // ... existing properties
  environment?: Environment
  healthStatus?: HealthStatus
  clickCount: number
  lastClicked?: Date
  icon?: string
}

// Enhanced BookmarkGroup interface  
interface BookmarkGroup {
  // ... existing properties
  icon?: string
  parentId?: string
  subgroups?: BookmarkGroup[]
}

// New store properties
interface BookmarkStore {
  // ... existing properties
  sortBy: SortOption
  filterBy: FilterOption
  breadcrumbs: { id: string | null; name: string }[]
  
  // New actions
  incrementClickCount: (bookmarkId: string) => void
  setSortBy: (sortBy: SortOption) => void
  setFilterBy: (filterBy: FilterOption) => void
  setBreadcrumbs: (breadcrumbs: { id: string | null; name: string }[]) => void
  getSubgroups: (parentId: string | null) => BookmarkGroup[]
}
```

## Integration Example

Here's how all components work together in the main App component:

```typescript
import { useState, useEffect } from 'react'
import { GroupGrid } from '@/components/GroupGrid'
import { BookmarkGrid } from '@/components/BookmarkGrid'
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation'
import { useBookmarkStore } from '@/stores/useBookmarkStore'

function App() {
  const {
    bookmarks,
    groups,
    searchQuery,
    selectedGroupId,
    breadcrumbs,
    setSelectedGroupId,
    setBreadcrumbs,
    filteredBookmarks,
    getSubgroups
  } = useBookmarkStore()

  const handleGroupClick = (group) => {
    setSelectedGroupId(group.id)
    const newBreadcrumbs = [...breadcrumbs, { id: group.id, name: group.name }]
    setBreadcrumbs(newBreadcrumbs)
  }

  const handleBreadcrumbNavigate = (groupId) => {
    setSelectedGroupId(groupId)
    const clickedIndex = breadcrumbs.findIndex(item => item.id === groupId)
    if (clickedIndex >= 0) {
      setBreadcrumbs(breadcrumbs.slice(0, clickedIndex + 1))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="flex-1 p-6">
        {/* Breadcrumb Navigation */}
        <BreadcrumbNavigation 
          breadcrumbs={breadcrumbs}
          onNavigate={handleBreadcrumbNavigate}
          className="mb-4"
        />

        {/* Root Level Groups (when no group selected and no search) */}
        {!selectedGroupId && !searchQuery && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Groups</h3>
            <GroupGrid
              groups={getSubgroups(null)}
              onGroupClick={handleGroupClick}
              onEditGroup={handleEditGroup}
              onDeleteGroup={handleDeleteGroup}
            />
          </div>
        )}
        
        {/* Subgroups (when in a group with subgroups) */}
        {selectedGroupId && getSubgroups(selectedGroupId).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Subgroups</h3>
            <GroupGrid
              groups={getSubgroups(selectedGroupId)}
              onGroupClick={handleGroupClick}
              onEditGroup={handleEditGroup}
              onDeleteGroup={handleDeleteGroup}
            />
          </div>
        )}

        {/* Bookmarks */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {searchQuery ? 'Search Results' : 'Bookmarks'}
          </h3>
          <BookmarkGrid
            bookmarks={filteredBookmarks()}
            onEditBookmark={handleEditBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            showControls={true}
          />
        </div>
      </main>
    </div>
  )
}
```

## Styling and Theming

All components support dark/light themes automatically through Tailwind CSS classes and CSS variables. The components use:

- Consistent spacing and typography
- Framer Motion for animations
- Lucide React for icons
- Tailwind utilities for responsive design
- CSS variables for theme colors

## Performance Features

- **Debounced search**: 150ms delay prevents excessive API calls
- **Virtualization ready**: Grid layouts support large datasets
- **Optimized animations**: Hardware-accelerated transforms
- **Lazy loading**: Images load with fallbacks
- **Memory efficient**: Proper cleanup and memoization

## Accessibility Features

- **Keyboard navigation**: Full support for keyboard users
- **ARIA labels**: Proper labeling for screen readers
- **Focus management**: Logical tab order
- **Color contrast**: WCAG compliant colors
- **Responsive design**: Works on all screen sizes

## Next Steps

1. **Add modals**: Create/edit dialogs for bookmarks and groups
2. **Drag & drop**: Reorganize bookmarks between groups
3. **Bulk operations**: Select multiple bookmarks for actions
4. **Import/export**: JSON/CSV support
5. **Advanced search**: Filters, date ranges, regex support