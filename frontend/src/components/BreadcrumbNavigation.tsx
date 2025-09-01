// ABOUTME: Hierarchical breadcrumb navigation component for group navigation
// ABOUTME: Shows current path with clickable navigation back to parent levels
import { ChevronRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

interface BreadcrumbItem {
  id: string | null
  name: string
}

interface BreadcrumbNavigationProps {
  breadcrumbs: BreadcrumbItem[]
  onNavigate: (id: string | null) => void
  className?: string
}

export function BreadcrumbNavigation({ breadcrumbs, onNavigate, className }: BreadcrumbNavigationProps) {
  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-center space-x-1 py-2", className)}
      aria-label="Breadcrumb navigation"
    >
      <AnimatePresence mode="popLayout">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1
          const isFirst = index === 0
          
          return (
            <motion.div
              key={`${item.id}-${index}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              {/* Breadcrumb Item */}
              <motion.div
                whileHover={!isLast ? { scale: 1.05 } : undefined}
                whileTap={!isLast ? { scale: 0.95 } : undefined}
              >
                {isLast ? (
                  <span className="flex items-center px-3 py-1.5 text-sm font-medium text-foreground bg-accent/50 rounded-lg">
                    {isFirst && <Home className="h-4 w-4 mr-2" />}
                    <span className="max-w-32 sm:max-w-48 truncate">{item.name}</span>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate(item.id)}
                    className="flex items-center px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    {isFirst && <Home className="h-4 w-4 mr-2" />}
                    <span className="max-w-24 sm:max-w-32 truncate">{item.name}</span>
                  </Button>
                )}
              </motion.div>

              {/* Separator */}
              {!isLast && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mx-1"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Mobile responsive indicator */}
      {breadcrumbs.length > 3 && (
        <div className="sm:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground ml-2"
          >
            ({breadcrumbs.length} levels)
          </motion.div>
        </div>
      )}
    </motion.nav>
  )
}