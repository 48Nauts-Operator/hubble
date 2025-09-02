import { useState, useRef } from 'react'
import { Download, Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { Button } from './ui/Button'
import { bookmarkApi, groupApi } from '../services/api'
import { useBookmarkStore } from '../stores/useBookmarkStore'

export function BackupRestore() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const setBookmarks = useBookmarkStore((state) => state.setBookmarks)
  const setGroups = useBookmarkStore((state) => state.setGroups)

  const handleExport = async () => {
    setIsExporting(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/backup/export')
      
      if (!response.ok) {
        throw new Error('Failed to export backup')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hubble-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setMessage({ type: 'success', text: 'Backup exported successfully!' })
    } catch (error) {
      console.error('Export error:', error)
      setMessage({ type: 'error', text: 'Failed to export backup' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setIsImporting(true)
    setMessage(null)
    
    try {
      // First validate the file
      const formData = new FormData()
      formData.append('backup', file)
      
      const validateResponse = await fetch('/api/backup/validate', {
        method: 'POST',
        body: formData
      })
      
      const validation = await validateResponse.json()
      
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid backup file')
      }
      
      // Show confirmation dialog
      const confirmMessage = importMode === 'replace' 
        ? `This will REPLACE all existing data with ${validation.statistics.groups} groups and ${validation.statistics.bookmarks} bookmarks. Continue?`
        : `This will import ${validation.statistics.groups} groups and ${validation.statistics.bookmarks} bookmarks. Existing items will be updated if they have the same ID. Continue?`
      
      if (!window.confirm(confirmMessage)) {
        setIsImporting(false)
        return
      }
      
      // Proceed with import
      const importFormData = new FormData()
      importFormData.append('backup', file)
      importFormData.append('mode', importMode)
      
      const importResponse = await fetch('/api/backup/import', {
        method: 'POST',
        body: importFormData
      })
      
      const result = await importResponse.json()
      
      if (!importResponse.ok) {
        throw new Error(result.error || 'Failed to import backup')
      }
      
      // Refresh the UI
      const [bookmarksData, groupsData] = await Promise.all([
        bookmarkApi.getAllBookmarks(),
        groupApi.getAllGroups()
      ])
      setBookmarks(bookmarksData)
      setGroups(groupsData)
      
      setMessage({ 
        type: 'success', 
        text: `Successfully imported ${result.statistics.groups_imported} groups and ${result.statistics.bookmarks_imported} bookmarks!` 
      })
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Import error:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to import backup' })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="p-6 bg-card rounded-lg border border-border">
      <h2 className="text-xl font-semibold mb-4">Backup & Restore</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
          message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
          'bg-blue-500/10 text-blue-500 border border-blue-500/20'
        }`}>
          {message.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {message.type === 'error' && <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Export Section */}
        <div>
          <h3 className="text-sm font-medium mb-2">Export Backup</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Download all your bookmarks and groups as a JSON file
          </p>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Backup
              </>
            )}
          </Button>
        </div>
        
        {/* Import Section */}
        <div>
          <h3 className="text-sm font-medium mb-2">Restore Backup</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Upload a previously exported backup file to restore your data
          </p>
          
          {/* Import Mode Selection */}
          <div className="mb-4 space-y-2">
            <label className="text-sm font-medium">Import Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={(e) => setImportMode(e.target.value as 'merge')}
                  className="text-primary"
                />
                <span className="text-sm">Merge (Update existing, add new)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value as 'replace')}
                  className="text-primary"
                />
                <span className="text-sm">Replace (Delete all, then import)</span>
              </label>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={isImporting}
            className="hidden"
            id="backup-file-input"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            variant="outline"
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Choose Backup File
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}