import { X } from 'lucide-react'
import { Button } from './ui/Button'
import { BackupRestore } from './BackupRestore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-background rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
          <h2 className="text-xl font-semibold">Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          <BackupRestore />
          
          {/* Version Info */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium mb-2">About Hubble</h3>
            <p className="text-xs text-muted-foreground">
              Version 1.2.0 • Intelligent Bookmark Dashboard
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              © 2025 Hubble • Made with ❤️ for developers
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}