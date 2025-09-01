import { useMemo } from 'react'
import Fuse from 'fuse.js'
import type { Bookmark } from '@/stores/useBookmarkStore'

const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'description', weight: 0.3 },
    { name: 'url', weight: 0.2 },
    { name: 'tags', weight: 0.1 }
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2
}

export function useSearch(bookmarks: Bookmark[], query: string) {
  const fuse = useMemo(() => {
    return new Fuse(bookmarks, fuseOptions)
  }, [bookmarks])

  const results = useMemo(() => {
    if (!query.trim()) return bookmarks
    
    const fuseResults = fuse.search(query)
    return fuseResults.map(result => result.item)
  }, [fuse, query, bookmarks])

  return results
}