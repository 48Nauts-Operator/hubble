// ABOUTME: Enhanced search component with real-time search, debouncing, and keyboard shortcuts
// ABOUTME: Features search suggestions dropdown, clear button, and responsive design
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Command, ArrowUp } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'
import { useBookmarkStore } from '@/stores/useBookmarkStore'

interface SearchSuggestion {
  type: 'bookmark' | 'tag' | 'group'
  text: string
  count?: number
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  showSuggestions?: boolean
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = "Search bookmarks, tags, or groups...",
  className,
  showSuggestions = true
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  const { bookmarks, groups } = useBookmarkStore()

  // Debounce search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, 150)

    return () => clearTimeout(timer)
  }, [value])

  // Generate search suggestions
  const generateSuggestions = useCallback((query: string): SearchSuggestion[] => {
    if (!query.trim() || query.length < 2) return []

    const suggestions: SearchSuggestion[] = []
    const queryLower = query.toLowerCase()
    const maxSuggestions = 8

    // Bookmark title suggestions
    const bookmarkTitles = bookmarks
      .filter(bookmark => 
        bookmark.title.toLowerCase().includes(queryLower) && 
        suggestions.length < maxSuggestions
      )
      .slice(0, 3)
      .map(bookmark => ({
        type: 'bookmark' as const,
        text: bookmark.title
      }))

    suggestions.push(...bookmarkTitles)

    // Tag suggestions
    const allTags = bookmarks.flatMap(bookmark => bookmark.tags)
    const uniqueTags = Array.from(new Set(allTags))
    const tagSuggestions = uniqueTags
      .filter(tag => 
        tag.toLowerCase().includes(queryLower) && 
        suggestions.length < maxSuggestions
      )
      .slice(0, 3)
      .map(tag => ({
        type: 'tag' as const,
        text: tag,
        count: allTags.filter(t => t === tag).length
      }))

    suggestions.push(...tagSuggestions)

    // Group name suggestions
    const groupSuggestions = groups
      .filter(group => 
        group.name.toLowerCase().includes(queryLower) && 
        suggestions.length < maxSuggestions
      )
      .slice(0, 2)
      .map(group => ({
        type: 'group' as const,
        text: group.name
      }))

    suggestions.push(...groupSuggestions)

    return suggestions.slice(0, maxSuggestions)
  }, [bookmarks, groups])

  // Update suggestions when debounced value changes
  useEffect(() => {
    if (showSuggestions && isFocused) {
      setSuggestions(generateSuggestions(debouncedValue))
      setSelectedSuggestionIndex(-1)
    } else {
      setSuggestions([])
    }
  }, [debouncedValue, isFocused, showSuggestions, generateSuggestions])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }

      // Handle suggestions navigation only when input is focused
      if (!isFocused || suggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : -1
          )
          break
        case 'Enter':
          if (selectedSuggestionIndex >= 0) {
            e.preventDefault()
            onChange(suggestions[selectedSuggestionIndex].text)
            setIsFocused(false)
            inputRef.current?.blur()
          }
          break
        case 'Escape':
          setIsFocused(false)
          inputRef.current?.blur()
          setSelectedSuggestionIndex(-1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFocused, suggestions, selectedSuggestionIndex, onChange])

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text)
    setIsFocused(false)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'bookmark':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M10 12h4" />
          </svg>
        )
      case 'tag':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )
      case 'group':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2" />
          </svg>
        )
    }
  }

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay blur to allow suggestion clicks
            setTimeout(() => setIsFocused(false), 150)
          }}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-20 transition-all duration-200",
            isFocused && "ring-2 ring-primary/20 border-primary/30"
          )}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {value && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-6 w-6 hover:bg-secondary"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          <div className="hidden sm:flex items-center space-x-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && isFocused && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={`${suggestion.type}-${suggestion.text}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                    index === selectedSuggestionIndex && "bg-accent"
                  )}
                >
                  <div className="text-muted-foreground">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 truncate">{suggestion.text}</div>
                  {suggestion.count && (
                    <div className="text-xs text-muted-foreground">
                      {suggestion.count}
                    </div>
                  )}
                  {index === selectedSuggestionIndex && (
                    <ArrowUp className="h-3 w-3 text-muted-foreground rotate-45" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}