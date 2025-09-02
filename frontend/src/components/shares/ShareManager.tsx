// ABOUTME: ShareManager component - Main interface for managing shared bookmark views
// ABOUTME: Orchestrates share creation, listing, editing, and analytics with integrated wizard flow

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Share2, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SharesList } from './SharesList'
import { CreateShareWizard } from './CreateShareWizard'
import { shareApi, SharedView, CreateShareRequest, UpdateShareRequest } from '@/services/shareApi'

interface ShareManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function ShareManager({ isOpen, onClose }: ShareManagerProps) {
  const [shares, setShares] = useState<SharedView[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  // const [editingShare, setEditingShare] = useState<SharedView | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadShares()
    }
  }, [isOpen])

  const loadShares = async () => {
    try {
      setLoading(true)
      setError(null)
      const sharesData = await shareApi.getAllShares()
      setShares(sharesData)
    } catch (err: any) {
      setError(err.message || 'Failed to load shares')
      console.error('Error loading shares:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShare = async (shareData: CreateShareRequest) => {
    try {
      setIsSubmitting(true)
      setError(null)
      const newShare = await shareApi.createShare(shareData)
      setShares(prev => [newShare, ...prev])
      setShowCreateWizard(false)
      
      // Show success feedback
      const successMessage = `Share "${newShare.name}" created successfully!`
      console.log(successMessage)
      
    } catch (err: any) {
      setError(err.message || 'Failed to create share')
      throw err // Re-throw to let the wizard handle it
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditShare = (share: SharedView) => {
    // For now, just show the wizard with pre-filled data
    // In a full implementation, you'd create an EditShareWizard component
    console.log('Edit share:', share)
    // setEditingShare(share)
    // TODO: Implement edit functionality
  }

  const handleDeleteShare = async (shareId: string) => {
    const share = shares.find(s => s.id === shareId)
    if (!share) return

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the share "${share.name}"? This action cannot be undone.`
    )

    if (!confirmDelete) return

    try {
      await shareApi.deleteShare(shareId)
      setShares(prev => prev.filter(s => s.id !== shareId))
      
      // Show success feedback
      console.log(`Share "${share.name}" deleted successfully`)
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete share')
      console.error('Error deleting share:', err)
    }
  }

  const handleToggleStatus = async (shareId: string, isPublic: boolean) => {
    const share = shares.find(s => s.id === shareId)
    if (!share) return

    try {
      const updateData: UpdateShareRequest = {
        isPublic
      }
      
      const updatedShare = await shareApi.updateShare(shareId, updateData)
      setShares(prev => prev.map(s => s.id === shareId ? updatedShare : s))
      
      console.log(`Share "${share.name}" is now ${isPublic ? 'public' : 'private'}`)
      
    } catch (err: any) {
      setError(err.message || 'Failed to update share status')
      console.error('Error updating share:', err)
    }
  }

  const getShareStats = () => {
    const total = shares.length
    const active = shares.filter(s => s.isPublic && 
      (!s.access.expiresAt || s.access.expiresAt > new Date()) &&
      (!s.access.maxUses || s.access.currentUses < s.access.maxUses)
    ).length
    const totalViews = shares.reduce((sum, s) => sum + s.access.currentUses, 0)
    
    return { total, active, totalViews }
  }

  if (!isOpen) return null

  const stats = getShareStats()

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-background border border-border rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Share2 className="h-6 w-6" />
                Share Management
              </h2>
              <p className="text-muted-foreground">
                Create and manage shareable bookmark collections
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadShares}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                onClick={() => setShowCreateWizard(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Share
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-6 border-b border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <Share2 className="h-8 w-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Shares</p>
                      <p className="text-2xl font-bold">{stats.active}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">{stats.totalViews}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/20 border border-red-400/50 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-300">Error</p>
                  <p className="text-sm text-red-200">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError(null)}
                    className="mt-2 h-6 text-red-300 hover:text-red-200"
                  >
                    Dismiss
                  </Button>
                </div>
              </motion.div>
            )}

            {loading && shares.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading shares...</p>
                </div>
              </div>
            ) : shares.length === 0 && !loading ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Share2 className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-2">No shares yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your first shared view to collaborate with others or provide public access to curated bookmark collections.
                </p>
                <Button
                  onClick={() => setShowCreateWizard(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Share
                </Button>
              </motion.div>
            ) : (
              <SharesList
                shares={shares}
                loading={loading}
                onEdit={handleEditShare}
                onDelete={handleDeleteShare}
                onToggleStatus={handleToggleStatus}
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* Create Share Wizard */}
      <CreateShareWizard
        isOpen={showCreateWizard}
        onClose={() => {
          setShowCreateWizard(false)
          setError(null)
        }}
        onSubmit={handleCreateShare}
        isSubmitting={isSubmitting}
      />
    </>
  )
}