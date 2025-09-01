// ABOUTME: Modal component for editing bookmark groups with name, icon, and color selection
// ABOUTME: Features color palette for group theming that applies to all cards in the group

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { groupApi } from '@/services/api'
import type { BookmarkGroup } from '@/stores/useBookmarkStore'
import { useBookmarkStore } from '@/stores/useBookmarkStore'

interface EditGroupModalProps {
  isOpen: boolean
  onClose: () => void
  group: BookmarkGroup | null
}

// Predefined color palette for groups
const GROUP_COLORS = [
  { name: 'Emerald', value: '#10b981', hex: '#10b981' },
  { name: 'Blue', value: '#3b82f6', hex: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6', hex: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899', hex: '#ec4899' },
  { name: 'Red', value: '#ef4444', hex: '#ef4444' },
  { name: 'Orange', value: '#f97316', hex: '#f97316' },
  { name: 'Yellow', value: '#eab308', hex: '#eab308' },
  { name: 'Teal', value: '#14b8a6', hex: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1', hex: '#6366f1' },
  { name: 'Gray', value: '#6b7280', hex: '#6b7280' },
  { name: 'Slate', value: '#475569', hex: '#475569' },
  { name: 'Cyan', value: '#06b6d4', hex: '#06b6d4' },
]

// Common group icons
const GROUP_ICONS = [
  '📁', '🏠', '💼', '🚀', '⚡', '🔧', '📊', '🎯', 
  '💡', '🔒', '🌟', '📱', '💻', '🌐', '🎨', '📚',
  '🔬', '🏭', '🛠️', '⚙️', '📈', '🗂️', '🔗', '🎮'
]

export function EditGroupModal({ isOpen, onClose, group }: EditGroupModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [color, setColor] = useState('#10b981')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const updateGroup = useBookmarkStore((state) => state.updateGroup)

  // Pre-populate form when group changes
  useEffect(() => {
    if (group) {
      setName(group.name || '')
      setIcon(group.icon || '📁')
      setColor(group.color || '#10b981')
      setDescription(group.description || '')
    }
  }, [group])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const updatedGroup = await groupApi.updateGroup(group.id, {
        name: name.trim(),
        icon: icon.trim() || '📁',
        color: color,
        description: description.trim() || undefined
      })
      
      updateGroup(group.id, updatedGroup)
      onClose()
    } catch (err) {
      console.error('Failed to update group:', err)
      setError('Failed to update group. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !group) return null

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
            className="w-full max-w-md max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Edit Group</h2>
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
                  <label htmlFor="name" className="text-sm font-medium">Group Name *</label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Group"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this group..."
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                  />
                </div>
                
                {/* Icon Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center space-x-2">
                    <span>Icon</span>
                    <span className="text-xs text-muted-foreground">(click to select)</span>
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {GROUP_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`p-2 text-lg rounded-lg border-2 transition-all ${
                          icon === emoji
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Color Palette */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center space-x-2">
                    <Palette className="h-4 w-4" />
                    <span>Group Color</span>
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {GROUP_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() => setColor(colorOption.value)}
                        className={`h-10 rounded-lg border-2 transition-all ${
                          color === colorOption.value
                            ? 'border-foreground scale-110 shadow-lg'
                            : 'border-border hover:scale-105'
                        }`}
                        style={{ backgroundColor: colorOption.hex }}
                        title={colorOption.name}
                      />
                    ))}
                  </div>
                  
                  {/* Custom Color Input */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 w-10 rounded border border-border cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                {/* Preview */}
                <div className="p-4 rounded-lg border-2" style={{ borderColor: color, backgroundColor: `${color}10` }}>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{icon}</span>
                    <span className="font-semibold" style={{ color }}>{name || 'Group Name'}</span>
                  </div>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-2">{description}</p>
                  )}
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
                      Update Group
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