import { useNavigate } from 'react-router-dom'
import { Search, Moon, Sun, Plus, Container, LayoutGrid, List, Settings, Share2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useBookmarkStore } from '@/stores/useBookmarkStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useViewStore } from '@/stores/useViewStore'
import { authService } from '@/services/authApi'
import { motion } from 'framer-motion'

interface HeaderProps {
  onAddBookmark?: () => void
  onAddGroup?: () => void
  onDiscover?: () => void
  onSettings?: () => void
  onShare?: () => void
}

export function Header({ onAddBookmark, onAddGroup, onDiscover, onSettings, onShare }: HeaderProps) {
  const navigate = useNavigate()
  const { searchQuery, setSearchQuery } = useBookmarkStore()
  const { isDarkMode, toggleTheme } = useThemeStore()
  const { viewMode, toggleViewMode } = useViewStore()
  
  const handleLogout = async () => {
    await authService.logout()
    navigate('/login')
  }

  return (
    <motion.header 
      className="sticky top-0 z-50 w-full border-b-2 border-slate-200 dark:border-emerald-400/50 bg-white/80 dark:bg-[#1a2332]/90 backdrop-blur-xl shadow-lg"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <motion.img
            src="/hubble-icon.svg"
            alt="Hubble"
            className="h-9 w-9"
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
          />
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
            Hubble
          </h1>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddBookmark}
            className="hidden sm:flex"
          >
            <Plus className="h-4 w-4 mr-2" />
            Bookmark
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onAddGroup}
            className="hidden sm:flex"
          >
            <Plus className="h-4 w-4 mr-2" />
            Group
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDiscover}
            className="hidden sm:flex hover:text-emerald-500 dark:hover:text-emerald-400"
            title="Discover Docker containers"
          >
            <Container className="h-4 w-4 mr-2" />
            Discover
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="hidden sm:flex hover:text-emerald-500 dark:hover:text-emerald-400"
            title="Manage shares"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          {/* View Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleViewMode}
            className="hover:text-emerald-500 dark:hover:text-emerald-400"
            title={`Switch to ${viewMode === 'card' ? 'list' : 'card'} view`}
          >
            {viewMode === 'card' ? (
              <List className="h-4 w-4" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
          </Button>

          {/* Settings Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onSettings}
            className="hover:text-emerald-500 dark:hover:text-emerald-400"
            title="Settings & Backup"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <motion.div
              initial={false}
              animate={{ rotate: isDarkMode ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </motion.div>
          </Button>

          {/* Logout Button - only show if auth is enabled */}
          {authService.isAuthenticated() && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              className="hover:text-red-500 dark:hover:text-red-400"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  )
}