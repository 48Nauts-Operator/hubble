// ABOUTME: Modal component for editing existing bookmarks with all fields pre-populated
// ABOUTME: Supports updating title, URLs, description, group, tags, and environment settings

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { bookmarkApi } from '@/services/api'
import type { Bookmark, BookmarkGroup } from '@/stores/useBookmarkStore'
import { useBookmarkStore } from '@/stores/useBookmarkStore'

interface EditBookmarkModalProps {
  isOpen: boolean
  onClose: () => void
  bookmark: Bookmark | null
  groups: BookmarkGroup[]
}

export function EditBookmarkModal({ isOpen, onClose, bookmark, groups }: EditBookmarkModalProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [internalUrl, setInternalUrl] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState<string>('')
  const [tags, setTags] = useState('')
  const [icon, setIcon] = useState('')
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'uat' | 'development' | 'local'>('production')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const updateBookmark = useBookmarkStore((state) => state.updateBookmark)

  // Pre-populate form when bookmark changes
  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title || '')
      setUrl(bookmark.url || '')
      setInternalUrl(bookmark.internalUrl || '')
      setDescription(bookmark.description || '')
      setGroupId(bookmark.groupId || '')
      setTags(bookmark.tags?.join(', ') || '')
      setIcon(bookmark.icon || '')
      setEnvironment((bookmark.environment || 'production') as any)
    }
  }, [bookmark])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookmark) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const updatedBookmark = await bookmarkApi.updateBookmark(bookmark.id, {
        title: title.trim(),
        url: url.trim(),
        internalUrl: internalUrl.trim() || undefined,
        description: description.trim() || undefined,
        groupId: groupId || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        icon: icon.trim() || undefined,
        environment: environment
      })
      
      updateBookmark(bookmark.id, updatedBookmark)
      onClose()
    } catch (err) {
      console.error('Failed to update bookmark:', err)
      setError('Failed to update bookmark. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !bookmark) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal - properly centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
          <motion.div
            className="w-full max-w-lg max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Edit Bookmark</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Title *</label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Bookmark"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="url" className="text-sm font-medium">External URL *</label>
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="internalUrl" className="text-sm font-medium">Internal URL (optional)</label>
                  <Input
                    id="internalUrl"
                    type="url"
                    value={internalUrl}
                    onChange={(e) => setInternalUrl(e.target.value)}
                    placeholder="http://192.168.1.100:3000"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="group" className="text-sm font-medium">Group</label>
                    <select
                      id="group"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">No Group</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.icon} {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="environment" className="text-sm font-medium">Environment</label>
                    <select
                      id="environment"
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="uat">UAT</option>
                      <option value="development">Development</option>
                      <option value="local">Local</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="tags" className="text-sm font-medium">Tags (comma-separated)</label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="web, api, dashboard"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="icon" className="text-sm font-medium">Icon (emoji or URL)</label>
                  <Input
                    id="icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="🚀 or https://example.com/icon.png"
                  />
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-end space-x-2 p-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <motion.div
                        className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Bookmark
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}