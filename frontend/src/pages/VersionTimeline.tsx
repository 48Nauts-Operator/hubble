// ABOUTME: Version timeline page showing feature releases and changelog
// ABOUTME: Displays chronological history of Hubble updates and improvements

import { motion } from 'framer-motion'
import { 
  Calendar,
  CheckCircle,
  Sparkles,
  Zap,
  Shield,
  GitBranch,
  Package,
  Palette,
  Search,
  Container,
  List,
  Clock,
  ArrowLeft
} from 'lucide-react'

interface Version {
  version: string
  date: string
  type: 'major' | 'minor' | 'patch'
  features: string[]
  icon: React.ReactNode
  color: string
}

const versions: Version[] = [
  {
    version: '1.3.0',
    date: 'September 2, 2025',
    type: 'minor',
    icon: <GitBranch className="h-5 w-5" />,
    color: '#ec4899',
    features: [
      'Complete sharing system with unique shareable links',
      'Public and private shared views with permissions',
      'Share creation wizard with 5-step configuration',
      'Drag-and-drop group reordering in sidebar',
      'Backup/restore functionality with JSON export/import',
      'Fixed Docker discovery ID generation',
      'Fixed URL priority (FQDN always takes precedence)',
      'Share analytics and access tracking'
    ]
  },
  {
    version: '1.2.0',
    date: 'September 1, 2025',
    type: 'minor',
    icon: <List className="h-5 w-5" />,
    color: '#8b5cf6',
    features: [
      'Added list view toggle for better information density',
      'Version timeline page with release history',
      'Improved view persistence across sessions',
      'Enhanced Documentation group layout'
    ]
  },
  {
    version: '1.1.0',
    date: 'September 1, 2025',
    type: 'minor',
    icon: <Container className="h-5 w-5" />,
    color: '#0ea5e9',
    features: [
      'Docker container discovery service',
      'Auto-import containers as bookmarks',
      'Real-time container monitoring',
      'Service type detection and categorization',
      'Default developer groups with 36+ bookmarks'
    ]
  },
  {
    version: '1.0.5',
    date: 'August 31, 2025',
    type: 'patch',
    icon: <Palette className="h-5 w-5" />,
    color: '#10b981',
    features: [
      'Dark theme redesign with royal navy background',
      'Mint/emerald accent colors',
      'Improved visibility with thicker borders',
      'Glass morphism effects'
    ]
  },
  {
    version: '1.0.4',
    date: 'August 31, 2025',
    type: 'patch',
    icon: <Sparkles className="h-5 w-5" />,
    color: '#f59e0b',
    features: [
      'Group management with custom colors and icons',
      'Edit functionality for bookmarks and groups',
      'Icon selection from 24 options',
      '12 predefined color palettes'
    ]
  },
  {
    version: '1.0.3',
    date: 'August 31, 2025',
    type: 'patch',
    icon: <Zap className="h-5 w-5" />,
    color: '#ef4444',
    features: [
      'Card flip animation with detailed back view',
      'Automatic favicon detection',
      'Brand color recognition for 30+ services',
      'Uniform card sizing'
    ]
  },
  {
    version: '1.0.2',
    date: 'August 31, 2025',
    type: 'patch',
    icon: <Search className="h-5 w-5" />,
    color: '#3b82f6',
    features: [
      'Fuzzy search with Fuse.js',
      'Real-time WebSocket updates',
      'Breadcrumb navigation',
      'Environment tags and indicators'
    ]
  },
  {
    version: '1.0.1',
    date: 'August 30, 2025',
    type: 'patch',
    icon: <Shield className="h-5 w-5" />,
    color: '#6366f1',
    features: [
      'SQLite database integration',
      'Express.js REST API',
      'MCP server for programmatic access',
      'Health monitoring for URLs'
    ]
  },
  {
    version: '1.0.0',
    date: 'August 30, 2025',
    type: 'major',
    icon: <Package className="h-5 w-5" />,
    color: '#ec4899',
    features: [
      'Initial release of Hubble',
      'React 18 with TypeScript',
      'Tailwind CSS + Radix UI',
      'Docker containerization',
      'Hierarchical groups system'
    ]
  }
]

export function VersionTimeline() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-[#1a2332] dark:via-[#1f2937] dark:to-emerald-950/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-slate-200 dark:border-emerald-400/50 bg-white/80 dark:bg-[#1a2332]/90 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.close()}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <img
                  src="/hubble-icon.svg"
                  alt="Hubble"
                  className="h-8 w-8"
                />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                    Hubble Version Timeline
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Track our journey of continuous improvement
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-muted-foreground">Current:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                v1.2.0
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
          >
            <div className="bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-xl rounded-lg p-6 border-2 border-slate-200 dark:border-emerald-400/30">
              <div className="flex items-center space-x-3">
                <GitBranch className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-sm text-muted-foreground">Releases</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-xl rounded-lg p-6 border-2 border-slate-200 dark:border-emerald-400/30">
              <div className="flex items-center space-x-3">
                <Sparkles className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">40+</p>
                  <p className="text-sm text-muted-foreground">Features</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-xl rounded-lg p-6 border-2 border-slate-200 dark:border-emerald-400/30">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">2 Days</p>
                  <p className="text-sm text-muted-foreground">Development</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-purple-500 to-pink-500 opacity-30" />
            
            {/* Version entries */}
            <div className="space-y-8">
              {versions.map((version, index) => (
                <motion.div
                  key={version.version}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex items-start space-x-6"
                >
                  {/* Timeline dot */}
                  <div
                    className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white dark:border-[#1a2332] shadow-lg"
                    style={{ backgroundColor: version.color }}
                  >
                    {version.icon}
                  </div>
                  
                  {/* Content card */}
                  <div className="flex-1 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-xl rounded-lg p-6 border-2 border-slate-200 dark:border-emerald-400/30 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold" style={{ color: version.color }}>
                          Version {version.version}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-4 w-4" />
                          <span>{version.date}</span>
                          {version.type === 'major' && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
                              Major Release
                            </span>
                          )}
                          {version.type === 'minor' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                              New Features
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <ul className="space-y-2">
                      {version.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 text-center text-sm text-muted-foreground"
          >
            <p>Built with ❤️ for developers who manage multiple projects</p>
            <p className="mt-2">
              Hubble is actively maintained and continuously improved based on user feedback
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  )
}