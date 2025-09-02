// ABOUTME: CreateShareWizard component for multi-step share creation process
// ABOUTME: Guides users through content selection, permissions, access control, and appearance customization

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Folder, 
  Clock, 
  Palette, 
  Eye,
  Shield
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useBookmarkStore } from '@/stores/useBookmarkStore'
import { CreateShareRequest } from '@/services/shareApi'

interface CreateShareWizardProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (shareData: CreateShareRequest) => Promise<void>
  isSubmitting: boolean
}

type WizardStep = 'content' | 'permissions' | 'access' | 'appearance' | 'review'

const STEPS: { key: WizardStep; title: string; icon: React.ComponentType<any> }[] = [
  { key: 'content', title: 'Select Content', icon: Folder },
  { key: 'permissions', title: 'Set Permissions', icon: Shield },
  { key: 'access', title: 'Configure Access', icon: Clock },
  { key: 'appearance', title: 'Customize Appearance', icon: Palette },
  { key: 'review', title: 'Review & Create', icon: Eye }
]

export function CreateShareWizard({ isOpen, onClose, onSubmit, isSubmitting }: CreateShareWizardProps) {
  const { groups, bookmarks } = useBookmarkStore()
  const [currentStep, setCurrentStep] = useState<WizardStep>('content')
  const [formData, setFormData] = useState<CreateShareRequest>({
    name: '',
    description: '',
    isPublic: true,
    permissions: {
      canAdd: false,
      canEdit: false,
      canDelete: false
    },
    access: {},
    appearance: {
      theme: 'system',
      title: '',
      description: '',
      showDescription: true,
      showTags: true,
      showEnvironment: true
    },
    selectedGroups: [],
    selectedBookmarks: []
  })

  const stepIndex = STEPS.findIndex(s => s.key === currentStep)
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === STEPS.length - 1

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('content')
      setFormData({
        name: '',
        description: '',
        isPublic: true,
        permissions: {
          canAdd: false,
          canEdit: false,
          canDelete: false
        },
        access: {},
        appearance: {
          theme: 'system',
          title: '',
          description: '',
          showDescription: true,
          showTags: true,
          showEnvironment: true
        },
        selectedGroups: [],
        selectedBookmarks: []
      })
    }
  }, [isOpen])

  const handleNext = () => {
    if (isLastStep) return
    const nextIndex = stepIndex + 1
    setCurrentStep(STEPS[nextIndex].key)
  }

  const handlePrev = () => {
    if (isFirstStep) return
    const prevIndex = stepIndex - 1
    setCurrentStep(STEPS[prevIndex].key)
  }

  const handleSubmit = async () => {
    // Final validation
    if (!formData.name.trim()) {
      console.error('Share name is required')
      return
    }
    
    if (formData.selectedGroups.length === 0 && formData.selectedBookmarks.length === 0) {
      console.error('At least one group or bookmark must be selected')
      return
    }
    
    console.log('Submitting share data:', formData)
    await onSubmit(formData)
  }

  const updateFormData = (updates: Partial<CreateShareRequest>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const toggleGroup = (groupId: string) => {
    const isSelected = formData.selectedGroups.includes(groupId)
    updateFormData({
      selectedGroups: isSelected
        ? formData.selectedGroups.filter(id => id !== groupId)
        : [...formData.selectedGroups, groupId]
    })
  }

  const toggleBookmark = (bookmarkId: string) => {
    const isSelected = formData.selectedBookmarks.includes(bookmarkId)
    updateFormData({
      selectedBookmarks: isSelected
        ? formData.selectedBookmarks.filter(id => id !== bookmarkId)
        : [...formData.selectedBookmarks, bookmarkId]
    })
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'content':
        return formData.selectedGroups.length > 0 || formData.selectedBookmarks.length > 0
      case 'permissions':
        return true
      case 'access':
        return true
      case 'appearance':
        return formData.name.trim().length > 0
      case 'review':
        return true
      default:
        return false
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'content':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Select Groups</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which bookmark groups to include in the shared view
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {groups.map(group => (
                  <Card 
                    key={group.id} 
                    className={`cursor-pointer transition-all ${
                      formData.selectedGroups.includes(group.id)
                        ? 'ring-2 ring-emerald-500 bg-emerald-500/5'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{group.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {bookmarks.filter(b => b.groupId === group.id).length} bookmarks
                          </p>
                        </div>
                        {formData.selectedGroups.includes(group.id) && (
                          <Check className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Individual Bookmarks</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select specific bookmarks to include (optional)
              </p>
              
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {bookmarks.slice(0, 20).map(bookmark => (
                  <Card 
                    key={bookmark.id}
                    className={`cursor-pointer transition-all ${
                      formData.selectedBookmarks.includes(bookmark.id)
                        ? 'ring-2 ring-emerald-500 bg-emerald-500/5'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleBookmark(bookmark.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{bookmark.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{bookmark.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {bookmark.url}
                          </p>
                        </div>
                        {formData.selectedBookmarks.includes(bookmark.id) && (
                          <Check className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )

      case 'permissions':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Access Permissions</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Control what users can do with the shared bookmarks
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">Read Access</p>
                      <p className="text-sm text-muted-foreground">
                        Users can view the shared bookmarks
                      </p>
                    </div>
                    <div className="text-emerald-500">
                      <Check className="h-5 w-5" />
                    </div>
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">Add Bookmarks</p>
                      <p className="text-sm text-muted-foreground">
                        Users can add new bookmarks to shared groups
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canAdd}
                      onChange={(e) => updateFormData({
                        permissions: { ...formData.permissions, canAdd: e.target.checked }
                      })}
                      className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">Edit Bookmarks</p>
                      <p className="text-sm text-muted-foreground">
                        Users can modify existing bookmarks
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canEdit}
                      onChange={(e) => updateFormData({
                        permissions: { ...formData.permissions, canEdit: e.target.checked }
                      })}
                      className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">Delete Bookmarks</p>
                      <p className="text-sm text-muted-foreground">
                        Users can remove bookmarks (use with caution)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canDelete}
                      onChange={(e) => updateFormData({
                        permissions: { ...formData.permissions, canDelete: e.target.checked }
                      })}
                      className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'access':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Access Control</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Set expiration and usage limits for the shared view
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <label className="flex items-center justify-between cursor-pointer mb-4">
                    <div>
                      <p className="font-medium">Public Access</p>
                      <p className="text-sm text-muted-foreground">
                        Anyone with the link can access this share
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => updateFormData({ isPublic: e.target.checked })}
                      className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Expiration Date (Optional)
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.access.expiresAt || ''}
                        onChange={(e) => updateFormData({
                          access: { ...formData.access, expiresAt: e.target.value }
                        })}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty for no expiration
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Maximum Uses (Optional)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        value={formData.access.maxUses || ''}
                        onChange={(e) => updateFormData({
                          access: { ...formData.access, maxUses: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum number of times this link can be accessed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Customize Appearance</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure how the shared view looks and what information is displayed
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Share Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="My Awesome Bookmarks"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Brief description of what you're sharing"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={formData.appearance.theme}
                  onChange={(e) => updateFormData({
                    appearance: { ...formData.appearance, theme: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="system">System Default</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Custom Title (Optional)</label>
                <Input
                  value={formData.appearance.title || ''}
                  onChange={(e) => updateFormData({
                    appearance: { ...formData.appearance, title: e.target.value }
                  })}
                  placeholder="Override the default title"
                />
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Display Options</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Show descriptions</span>
                    <input
                      type="checkbox"
                      checked={formData.appearance.showDescription}
                      onChange={(e) => updateFormData({
                        appearance: { ...formData.appearance, showDescription: e.target.checked }
                      })}
                      className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Show tags</span>
                    <input
                      type="checkbox"
                      checked={formData.appearance.showTags}
                      onChange={(e) => updateFormData({
                        appearance: { ...formData.appearance, showTags: e.target.checked }
                      })}
                      className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">Show environment badges</span>
                    <input
                      type="checkbox"
                      checked={formData.appearance.showEnvironment}
                      onChange={(e) => updateFormData({
                        appearance: { ...formData.appearance, showEnvironment: e.target.checked }
                      })}
                      className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Review Share Settings</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Review your settings and create the shareable link
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{formData.name}</CardTitle>
                {formData.description && (
                  <CardDescription>{formData.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-1">Content</p>
                    <p className="text-muted-foreground">
                      {formData.selectedGroups.length} groups, {formData.selectedBookmarks.length} bookmarks
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-1">Access</p>
                    <p className="text-muted-foreground">
                      {formData.isPublic ? 'Public' : 'Private'}
                      {formData.access.expiresAt && ' • Expires'}
                      {formData.access.maxUses && ` • ${formData.access.maxUses} uses max`}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium mb-1">Permissions</p>
                    <p className="text-muted-foreground">
                      {formData.permissions.canEdit ? 'Read/Write' : 'Read Only'}
                      {formData.permissions.canAdd && ' • Can Add'}
                      {formData.permissions.canDelete && ' • Can Delete'}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium mb-1">Theme</p>
                    <p className="text-muted-foreground capitalize">
                      {formData.appearance.theme}
                    </p>
                  </div>
                </div>

                {formData.selectedGroups.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Shared Groups:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.selectedGroups.map(groupId => {
                        const group = groups.find(g => g.id === groupId)
                        return group ? (
                          <span key={groupId} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-md text-xs">
                            <span>{group.icon}</span>
                            <span>{group.name}</span>
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">Create Share</h2>
            <p className="text-sm text-muted-foreground">
              Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex].title}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === stepIndex
              const isCompleted = index < stepIndex
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    isActive 
                      ? 'border-emerald-500 bg-emerald-500 text-white' 
                      : isCompleted 
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 transition-colors ${
                      isCompleted ? 'bg-emerald-500' : 'bg-muted'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={isFirstStep || isSubmitting}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="text-xs text-muted-foreground">
            {currentStep === 'content' && (
              `${formData.selectedGroups.length + formData.selectedBookmarks.length} items selected`
            )}
            {currentStep === 'permissions' && (
              `${Object.values(formData.permissions).filter(Boolean).length} permissions enabled`
            )}
          </div>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Share
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}