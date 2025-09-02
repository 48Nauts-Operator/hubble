// ABOUTME: SharesList component for displaying and managing existing shared views
// ABOUTME: Shows list of shares with actions like edit, delete, copy link, and view analytics

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Copy, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Calendar,
  Users,
  QrCode,
  Clock,
  Shield,
  Globe,
  Lock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SharedView } from '@/services/shareApi'
import QRCode from 'qrcode'

interface SharesListProps {
  shares: SharedView[]
  loading: boolean
  onEdit: (share: SharedView) => void
  onDelete: (shareId: string) => void
  onToggleStatus: (shareId: string, isPublic: boolean) => void
}

export function SharesList({ shares, loading, onEdit, onDelete, onToggleStatus }: SharesListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [qrModalShare, setQrModalShare] = useState<SharedView | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  const copyToClipboard = async (text: string, shareId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(shareId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const generateQRCode = async (share: SharedView) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(share.shareUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
        width: 256
      })
      setQrCodeUrl(qrDataUrl)
      setQrModalShare(share)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const isExpired = (share: SharedView) => {
    return share.access.expiresAt && share.access.expiresAt < new Date()
  }

  const isMaxUsesReached = (share: SharedView) => {
    return share.access.maxUses && share.access.currentUses >= share.access.maxUses
  }

  const getStatusColor = (share: SharedView) => {
    if (!share.isPublic) return 'text-yellow-500'
    if (isExpired(share) || isMaxUsesReached(share)) return 'text-red-500'
    return 'text-green-500'
  }

  const getStatusText = (share: SharedView) => {
    if (!share.isPublic) return 'Private'
    if (isExpired(share)) return 'Expired'
    if (isMaxUsesReached(share)) return 'Limit Reached'
    return 'Active'
  }

  const getStatusIcon = (share: SharedView) => {
    if (!share.isPublic) return Lock
    if (isExpired(share) || isMaxUsesReached(share)) return EyeOff
    return Eye
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (shares.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No shares created yet</h3>
        <p className="text-muted-foreground">
          Create your first shared view to share bookmarks with others
        </p>
      </motion.div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {shares.map((share, index) => {
          const StatusIcon = getStatusIcon(share)
          
          return (
            <motion.div
              key={share.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="group hover:shadow-lg transition-all duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${getStatusColor(share)}`} />
                        {share.name}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          share.isPublic ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {getStatusText(share)}
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {share.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(share.shareUrl, share.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy share link"
                      >
                        {copiedId === share.id ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-green-500"
                          >
                            ✓
                          </motion.div>
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => generateQRCode(share)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Generate QR code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(share)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit share"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(share.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                        title="Delete share"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDate(share.createdAt)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{share.access.currentUses || 0} views</span>
                    </div>
                    
                    {share.access.expiresAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Expires {formatDate(share.access.expiresAt)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>
                        {share.permissions.canEdit ? 'Read/Write' : 'Read Only'}
                      </span>
                    </div>
                  </div>
                  
                  {share.selectedGroups.length > 0 || share.selectedBookmarks.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        Sharing {share.selectedGroups.length} groups, {share.selectedBookmarks.length} bookmarks
                      </div>
                    </div>
                  ) : null}
                  
                  <div className="mt-4 flex items-center justify-between">
                    <a
                      href={share.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open shared view
                    </a>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleStatus(share.id, !share.isPublic)}
                      className="text-xs"
                    >
                      {share.isPublic ? 'Make Private' : 'Make Public'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* QR Code Modal */}
      {qrModalShare && qrCodeUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border border-border rounded-lg shadow-xl p-6 max-w-sm mx-4"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">QR Code</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Scan to access "{qrModalShare.name}"
              </p>
              
              <div className="bg-white p-4 rounded-lg mb-4 inline-block">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
              
              <div className="text-xs text-muted-foreground mb-4 break-all">
                {qrModalShare.shareUrl}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(qrCodeUrl, 'qr')}
                  className="flex-1"
                >
                  {copiedId === 'qr' ? 'Copied!' : 'Copy QR'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQrModalShare(null)
                    setQrCodeUrl('')
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}