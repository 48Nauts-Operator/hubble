import { useState } from 'react'
import { X } from 'lucide-react'
import { groupApi } from '@/services/api'
import { useBookmarkStore, type BookmarkGroup } from '@/stores/useBookmarkStore'

interface AddGroupModalProps {
  isOpen: boolean
  onClose: () => void
  groups: BookmarkGroup[]
}

export function AddGroupModal({ isOpen, onClose, groups }: AddGroupModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const [color, setColor] = useState('#d946ef')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { addGroup } = useBookmarkStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const group = await groupApi.createGroup({
        name,
        icon,
        description,
        parentId: parentId || undefined,
        color
      })
      
      addGroup(group)
      onClose()
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to create group')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setName('')
    setIcon('📁')
    setDescription('')
    setParentId(null)
    setColor('#d946ef')
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Add Group</h2>
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
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
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
            <label className="block text-sm font-medium mb-1">Parent Group</label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None (Top Level)</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.icon} {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 px-2 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
              disabled={isSubmitting || !name}
            >
              {isSubmitting ? 'Adding...' : 'Add Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}