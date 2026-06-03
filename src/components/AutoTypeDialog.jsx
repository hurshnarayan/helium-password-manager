import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { invoke } from '@tauri-apps/api/core'
import { Visibility, VisibilityOff, ContentCopy } from '@mui/icons-material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

export default function AutoTypeDialog({ isOpen, onClose, entries, onAutoType, activeEntryId }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredEntries, setFilteredEntries] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [windowTitle, setWindowTitle] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchWindowTitle()
      // Filter entries based on search
      const filtered = entries.filter(entry => {
        const query = searchQuery.toLowerCase()
        return (
          entry.name.toLowerCase().includes(query) ||
          entry.username.toLowerCase().includes(query) ||
          (entry.url && entry.url.toLowerCase().includes(query))
        )
      })
      setFilteredEntries(filtered)
      setSelectedIndex(0)
    }
  }, [isOpen, searchQuery, entries])

  const fetchWindowTitle = async () => {
    try {
      const title = await invoke('get_frontmost_window_title')
      setWindowTitle(title)
    } catch (e) {
      console.error('Failed to get window title:', e)
    }
  }

  const handleAutoType = async (entry) => {
    try {
      await onAutoType(entry)
      onClose()
    } catch (e) {
      console.error('AutoType failed:', e)
    }
  }

  const handleKeyDown = (e) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredEntries.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredEntries.length) % filteredEntries.length)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredEntries.length > 0) {
          handleAutoType(filteredEntries[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      default:
        break
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredEntries, selectedIndex])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-full max-w-2xl rounded-2xl border border-accent-cool/30 bg-bg-secondary shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-accent-cool/20 bg-gradient-to-r from-accent-cool/10 to-transparent">
              <h2 className="text-2xl font-bold text-text-primary mb-1">AutoType</h2>
              {windowTitle && (
                <p className="text-sm text-text-secondary">
                  Target window: <span className="text-accent-cool font-mono">{windowTitle}</span>
                </p>
              )}
              <p className="text-xs text-text-muted mt-2">
                Use ↑↓ to navigate, Enter to select, or double-click an entry
              </p>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-accent-cool/20 bg-bg-dark/50">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm"
                />
                <input
                  type="text"
                  placeholder="Search entries by name, username, or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-accent-cool/30 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/20 transition"
                  autoFocus
                />
              </div>
            </div>

            {/* Entries List */}
            <div className="max-h-[60vh] overflow-y-auto">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleAutoType(entry)}
                    onDoubleClick={() => handleAutoType(entry)}
                    className={`px-6 py-4 border-b border-accent-cool/10 cursor-pointer transition-all ${
                      selectedIndex === idx
                        ? 'bg-accent-cool/20 border-l-4 border-l-accent-cool'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary truncate">{entry.name}</p>
                        <p className="text-sm text-text-secondary truncate">
                          {entry.username || 'No username'}
                        </p>
                        {entry.url && (
                          <p className="text-xs text-text-muted truncate mt-1">{entry.url}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(entry.username)
                          }}
                          className="p-2 hover:bg-white/10 rounded transition"
                          title="Copy username"
                        >
                          <ContentCopy className="w-4 h-4 text-text-secondary hover:text-text-primary" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    {selectedIndex === idx && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex flex-wrap gap-2"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAutoType(entry)
                          }}
                          className="px-3 py-1.5 bg-accent-cool/30 hover:bg-accent-cool/50 text-accent-cool rounded text-xs font-semibold transition"
                        >
                          → AutoType
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(entry.password)
                          }}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-text-secondary rounded text-xs font-semibold transition"
                        >
                          📋 Copy Password
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(entry.username)
                          }}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-text-secondary rounded text-xs font-semibold transition"
                        >
                          👤 Copy Username
                        </button>
                        {entry.url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(entry.url)
                            }}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-text-secondary rounded text-xs font-semibold transition"
                          >
                            🔗 Copy URL
                          </button>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="p-12 text-center text-text-muted">
                  <p className="text-lg">No entries found</p>
                  <p className="text-sm mt-1">Try adjusting your search</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-accent-cool/20 bg-bg-dark/50 flex items-center justify-between text-xs text-text-muted">
              <div className="flex gap-4">
                <span>Ctrl+F - Focus search</span>
                <span>↑↓ - Navigate</span>
                <span>Enter - Select</span>
                <span>Esc - Close</span>
              </div>
              <span>{filteredEntries.length} entries</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

async function copyToClipboard(text) {
  try {
    await invoke('copy_to_clipboard', { text })
  } catch (e) {
    console.error('Copy failed:', e)
  }
}
