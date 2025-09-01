import { useState } from 'react'
import { X } from 'lucide-react'
import { bookmarkApi } from '@/services/api'
import { useBookmarkStore, type BookmarkGroup } from '@/stores/useBookmarkStore'

export interface AddBookmarkModalProps {
  isOpen: boolean
  onClose: () => void
  groups: BookmarkGroup[]
}

export function AddBookmarkModal({ isOpen, onClose, groups }: AddBookmarkModalProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [internalUrl, setInternalUrl] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState('')
  const [tags, setTags] = useState('')
  const [icon, setIcon] = useState('🔗')
  const [environment, setEnvironment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlMode, setUrlMode] = useState<'single' | 'dual'>('single')

  const { addBookmark } = useBookmarkStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const bookmark = await bookmarkApi.createBookmark({
        title,
        url: urlMode === 'single' ? url : (externalUrl || url),
        internalUrl: urlMode === 'dual' ? internalUrl : undefined,
        externalUrl: urlMode === 'dual' ? externalUrl : (urlMode === 'single' ? url : undefined),
        description,
        groupId: groupId || groups[0]?.id,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        icon,
        environment: environment as any,
        clickCount: 0
      })
      
      addBookmark(bookmark)
      onClose()
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to create bookmark')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setUrl('')
    setInternalUrl('')
    setExternalUrl('')
    setDescription('')
    setGroupId('')
    setTags('')
    setIcon('🔗')
    setEnvironment('')
    setUrlMode('single')
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Add Bookmark</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">URLs *</label>
              <div className="flex rounded-md border border-input">
                <button
                  type="button"
                  onClick={() => setUrlMode('single')}
                  className={`px-3 py-1 text-xs rounded-l-md transition-colors ${
                    urlMode === 'single' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Single URL
                </button>
                <button
                  type="button"
                  onClick={() => setUrlMode('dual')}
                  className={`px-3 py-1 text-xs rounded-r-md transition-colors ${
                    urlMode === 'dual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Dual URLs
                </button>
              </div>
            </div>
            
            {urlMode === 'single' ? (
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://example.com"
                required
              />
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">External URL (Public)</label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://myservice.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Internal URL (Network)</label>
                  <input
                    type="url"
                    value={internalUrl}
                    onChange={(e) => setInternalUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="http://192.168.1.100:3000"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.icon} {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="work, important, api"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None</option>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
                <option value="production">Production</option>
                <option value="local">Local</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={2}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={isSubmitting || !title || (urlMode === 'single' ? !url : (!externalUrl && !internalUrl))}
            >
              {isSubmitting ? 'Adding...' : 'Add Bookmark'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}