import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import LoginView from './views/LoginView'
import VaultView from './views/VaultView'
import SettingsView from './views/SettingsView'
import {
  buildAutotypeCandidates,
  buildAutotypeSearchCandidates,
  getAutotypeSequence,
  isRecentAutotypeMatch,
  normalizeAutotypeText,
} from './utils/autotype'
import './App.css'

const isTauriAvailable = () => {
  return typeof window !== 'undefined' && window.__TAURI__
}

function App() {
  const [view, setView] = useState('login')
  const [user, setUser] = useState(null)
  const [vault, setVault] = useState([])
  const [masterKey, setMasterKey] = useState(null)
  const [masterPassword, setMasterPassword] = useState(null)
  const [activeEntryId, setActiveEntryId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [accessibilityGranted, setAccessibilityGranted] = useState(false)
  const [accessibilityLoading, setAccessibilityLoading] = useState(false)
  const [autotypeChooser, setAutotypeChooser] = useState(null)
  const [lastAutotypeMatch, setLastAutotypeMatch] = useState(null)

  const handleLogin = async (email, password) => {
    setLoading(true)
    try {
      // store master password in memory for save/load operations
      setMasterPassword(password)

      // Try to initialize default hotkeys (only if Tauri available)
      if (isTauriAvailable()) {
        try {
          await invoke('init_default_hotkeys')
        } catch (e) {
          console.warn('Could not initialize default hotkeys:', e)
        }
      }

      // Load vault data
      if (!isTauriAvailable()) {
        throw new Error('Tauri not available. Please ensure the app is running as a native app.')
      }
      const vaultJson = await invoke('load_vault', { email, password })
      const loadedVault = JSON.parse(vaultJson)

      setUser({ email, authenticated: true })
      setMasterKey(null)
      setVault(loadedVault)
      setActiveEntryId(loadedVault[0]?.id ?? null)
      setView('vault')
      
      // Don't automatically check permissions - let user see the banner and decide
      // The banner will stay visible until user explicitly clicks "Request Permission"
    } catch (err) {
      console.error('Login failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setMasterKey(null)
    setVault([])
    setActiveEntryId(null)
    setAccessibilityGranted(false)
    setView('login')
  }

  const handleRequestAccessibility = async () => {
    try {
      setAccessibilityLoading(true)
      console.log('[AccessibilityRequest] Starting request...')
      
      // Check if we're in dev mode
      let isDevMode = false
      try {
        isDevMode = await invoke('is_dev_mode')
        console.log('[AccessibilityRequest] Dev mode?', isDevMode)
      } catch (e) {
        console.warn('[AccessibilityRequest] Could not determine dev mode:', e)
      }
      
      // Check current state first
      let currentlyEnabled = false
      try {
        currentlyEnabled = await invoke('is_accessibility_enabled')
        console.log('[AccessibilityRequest] Currently enabled?', currentlyEnabled)
        if (currentlyEnabled) {
          console.log('[AccessibilityRequest] ✓ Already enabled!')
          setAccessibilityGranted(true)
          setAccessibilityLoading(false)
          return
        }
      } catch (e) {
        console.error('[AccessibilityRequest] Error checking current state:', e)
        throw new Error(`Failed to check current permission: ${e}`)
      }
      
      // If in dev mode and accessibility is enabled, parent terminal likely has permission
      if (isDevMode && currentlyEnabled) {
        console.log('[AccessibilityRequest] ✓ Dev mode with accessibility enabled!')
        setAccessibilityGranted(true)
        setAccessibilityLoading(false)
        return
      }
      
      // Request accessibility - this should show the macOS dialog
      console.log('[AccessibilityRequest] Calling request_accessibility backend command...')
      try {
        await invoke('request_accessibility')
        console.log('[AccessibilityRequest] Backend command completed')
      } catch (e) {
        console.error('[AccessibilityRequest] Backend error calling request_accessibility:', e)
        throw new Error(`Backend failed: ${e}`)
      }
      
      // Wait longer for the user to respond to dialog
      console.log('[AccessibilityRequest] Waiting 5 seconds for user to respond to dialog...')
      await new Promise((resolve) => setTimeout(resolve, 5000))
      
      // Check if permission was granted - do multiple checks
      console.log('[AccessibilityRequest] Checking permission status after dialog...')
      let isNowEnabled = false
      try {
        isNowEnabled = await invoke('is_accessibility_enabled')
        console.log('[AccessibilityRequest] Permission check result:', isNowEnabled)
      } catch (e) {
        console.error('[AccessibilityRequest] Error checking permission status:', e)
        throw new Error(`Failed to verify permission: ${e}`)
      }
      
      if (isNowEnabled) {
        console.log('[AccessibilityRequest] ✓ Permission CONFIRMED granted!')
        setAccessibilityGranted(true)
      } else {
        console.log('[AccessibilityRequest] ✗ Permission NOT granted. Opening System Preferences...')
        setAccessibilityGranted(false)
        try {
          await invoke('open_system_prefs', { pane: 'accessibility' })
        } catch (e) {
          console.warn('[AccessibilityRequest] Could not open system prefs:', e)
        }
      }
    } catch (e) {
      console.error('[AccessibilityRequest] Error:', e.message)
      setAccessibilityGranted(false)
    } finally {
      setAccessibilityLoading(false)
    }
  }

  // Don't automatically check permissions - only check when user explicitly requests it
  // This prevents the macOS permission dialog from appearing and disappearing unexpectedly

  const handleAddPassword = async (entry) => {
    const newEntry = { ...entry, id: Date.now() }
    const updatedVault = [...vault, newEntry]

    try {
      await invoke('save_vault', { 
        email: user.email, 
        vaultData: JSON.stringify(updatedVault), 
        password: masterPassword
      })
      setVault(updatedVault)
      setActiveEntryId(newEntry.id)
      return newEntry
    } catch (err) {
      console.error('Failed to save vault:', err)
      throw err
    }
  }

  const handleDeletePassword = async (entryId) => {
    const updatedVault = vault.filter(e => e.id !== entryId)

    try {
      await invoke('save_vault', { 
        email: user.email, 
        vaultData: JSON.stringify(updatedVault), 
        password: masterPassword
      })
      setVault(updatedVault)
      if (activeEntryId === entryId) {
        setActiveEntryId(updatedVault[0]?.id ?? null)
      }
    } catch (err) {
      console.error('Failed to save vault:', err)
      throw err
    }
  }

  const handleUpdatePassword = async (updatedEntry) => {
    const updatedVault = vault.map(e => e.id === updatedEntry.id ? updatedEntry : e)

    try {
      await invoke('save_vault', { 
        email: user.email, 
        vaultData: JSON.stringify(updatedVault), 
        password: masterPassword
      })
      setVault(updatedVault)
      if (activeEntryId === updatedEntry.id) {
        setActiveEntryId(updatedEntry.id)
      }
      return updatedEntry
    } catch (err) {
      console.error('Failed to save vault:', err)
      throw err
    }
  }

  const performAutotype = async (entry, sequence = getAutotypeSequence(entry), meta = {}) => {
    if (!entry) return

    const context = {
      USERNAME: entry.username || '',
      PASSWORD: entry.password || '',
      URL: entry.url || '',
      TITLE: entry.name || '',
      TOTP: entry.totp || ''
    }

    await invoke('perform_sequence', {
      sequence,
      context: JSON.stringify(context),
      timeout: null
    })

    setLastAutotypeMatch({
      entryId: entry.id,
      sequence,
      windowTitle: meta.windowTitle || '',
      timestamp: Date.now()
    })
  }

  // Listen for hotkey triggers from backend
  useEffect(() => {
    if (!user) return

    let unlistener = null

    const setupListener = async () => {
      try {
        unlistener = await listen('hotkey_triggered', (event) => {
          const action = event.payload.action
          console.log('Hotkey triggered:', action)
          
          const entry = vault.find((v) => v.id === activeEntryId) || vault[0]
          if (entry) {
            if (action === 'autotype') {
              invoke('get_frontmost_window_title')
                .then((windowTitle) => {
                  const hasWindowTitle = normalizeAutotypeText(windowTitle).length > 0
                  const directCandidates = hasWindowTitle ? buildAutotypeCandidates(vault, windowTitle) : []
                  const searchCandidates = buildAutotypeSearchCandidates(vault)

                  if (hasWindowTitle && directCandidates.length === 1 && directCandidates[0].score > 0) {
                    return performAutotype(directCandidates[0].entry, directCandidates[0].sequence, { windowTitle })
                  }

                  if (isRecentAutotypeMatch(lastAutotypeMatch)) {
                    const currentCandidates = hasWindowTitle ? directCandidates : searchCandidates
                    const remembered = currentCandidates.find((candidate) => candidate.entry.id === lastAutotypeMatch.entryId && candidate.sequence === lastAutotypeMatch.sequence)
                    if (remembered) {
                      return performAutotype(remembered.entry, remembered.sequence, { windowTitle })
                    }
                  }

                  setAutotypeChooser({
                    windowTitle: windowTitle || '',
                    query: windowTitle || '',
                    mode: hasWindowTitle ? (directCandidates.length > 0 ? 'matches' : 'search') : 'search',
                    directCandidates,
                    searchCandidates
                  })
                  return null
                })
                .catch((e) => {
                  console.warn('Could not resolve active window title, falling back to selected entry:', e)
                  setAutotypeChooser({
                    windowTitle: '',
                    query: '',
                    mode: 'search',
                    directCandidates: [],
                    searchCandidates: buildAutotypeSearchCandidates(vault)
                  })
                  return null
                })
                .catch((e) => console.error('AutoType failed:', e))
            } else if (action === 'copy_username') {
              // Copy username to clipboard
              invoke('copy_username', { username: entry.username || '' }).catch(e => console.error('Copy failed:', e))
            } else if (action === 'copy_password') {
              // Copy password to clipboard
              invoke('copy_password', { password: entry.password || '' }).catch(e => console.error('Copy failed:', e))
            }
          }
        })
      } catch (e) {
        console.warn('Could not set up hotkey listener:', e)
      }
    }

    setupListener()

    return () => {
      if (unlistener) unlistener()
    }
  }, [user, vault, activeEntryId, lastAutotypeMatch])

  const chooserSource = autotypeChooser?.mode === 'search'
    ? autotypeChooser?.searchCandidates || []
    : autotypeChooser?.directCandidates || []

  const chooserCandidates = autotypeChooser
    ? chooserSource.filter((candidate) => {
        const query = normalizeAutotypeText(autotypeChooser.query)
        if (!query) return true
        const haystack = normalizeAutotypeText([
          candidate.entry.name,
          candidate.entry.username,
          candidate.entry.url,
          candidate.entry.notes,
          candidate.reason,
          candidate.sequence
        ].filter(Boolean).join(' '))
        return haystack.includes(query)
      })
    : []

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary font-sans">
      {!user ? (
        <LoginView onLogin={handleLogin} loading={loading} />
      ) : view === 'vault' ? (
        <VaultView 
          user={user} 
          vault={vault}
          masterKey={masterKey}
          onAddPassword={handleAddPassword}
          onUpdatePassword={handleUpdatePassword}
          onDeletePassword={handleDeletePassword}
          activeEntryId={activeEntryId}
          onActiveEntryChange={setActiveEntryId}
          onSettings={() => setView('settings')}
          onLogout={handleLogout}
          accessibilityGranted={accessibilityGranted}
          accessibilityLoading={accessibilityLoading}
          onRequestAccessibility={handleRequestAccessibility}
        />
      ) : (
        <SettingsView 
          user={user}
          onBack={() => setView('vault')}
          onLogout={handleLogout}
          accessibilityGranted={accessibilityGranted}
          accessibilityLoading={accessibilityLoading}
          onRequestAccessibility={handleRequestAccessibility}
        />
      )}

      {autotypeChooser && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setAutotypeChooser(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-accent-cool/30 bg-bg-secondary/95 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-accent-cool/20 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">AutoType Match</h2>
                <p className="text-sm text-text-secondary mt-1">
                  {autotypeChooser.windowTitle ? `Window: ${autotypeChooser.windowTitle}` : 'Select an entry to AutoType into.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutotypeChooser((state) => state ? { ...state, mode: 'matches' } : state)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    autotypeChooser.mode === 'matches'
                      ? 'border-accent-cool bg-accent-cool/20 text-text-primary'
                      : 'border-accent-cool/20 text-text-secondary hover:text-text-primary hover:bg-white/10'
                  }`}
                >
                  Matches
                </button>
                <button
                  onClick={() => setAutotypeChooser((state) => state ? { ...state, mode: 'search' } : state)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    autotypeChooser.mode === 'search'
                      ? 'border-accent-cool bg-accent-cool/20 text-text-primary'
                      : 'border-accent-cool/20 text-text-secondary hover:text-text-primary hover:bg-white/10'
                  }`}
                >
                  Search database
                </button>
                <button
                  onClick={() => setAutotypeChooser(null)}
                  className="px-3 py-1.5 rounded-lg border border-accent-cool/20 text-text-secondary hover:text-text-primary hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-5 border-b border-accent-cool/20 space-y-3">
              <input
                type="text"
                value={autotypeChooser.query}
                onChange={(e) => setAutotypeChooser((state) => state ? { ...state, query: e.target.value } : state)}
                placeholder={autotypeChooser.mode === 'matches' ? 'Filter matches' : 'Search entries'}
                className="w-full px-4 py-3 rounded-xl bg-bg-dark/70 border border-accent-cool/20 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cool focus:ring-2 focus:ring-accent-cool/20"
              />
              <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                <span className="px-2 py-1 rounded-full border border-accent-cool/15 bg-white/5">Enter / click = type sequence</span>
                <span className="px-2 py-1 rounded-full border border-accent-cool/15 bg-white/5">Use username/password/TOTP/URL actions for quick typing</span>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {chooserCandidates.length > 0 ? chooserCandidates.map((candidate) => (
                <div
                  key={`${candidate.entry.id}:${candidate.reason}:${candidate.sequence}`}
                  className="px-5 py-4 border-b border-accent-cool/10 hover:bg-white/8 transition"
                >
                  <button
                    onClick={() => {
                      setAutotypeChooser(null)
                      performAutotype(candidate.entry, candidate.sequence, { windowTitle: autotypeChooser.windowTitle }).catch((e) => console.error('AutoType failed:', e))
                    }}
                    className="w-full text-left flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate">{candidate.entry.name}</p>
                      <p className="text-xs text-text-secondary truncate">
                        {candidate.entry.username || 'No username'} {candidate.reason ? `• ${candidate.reason}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-accent-cool">{candidate.score > 0 ? 'Matched' : 'Search'}</span>
                    </div>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setAutotypeChooser(null)
                        performAutotype(candidate.entry, '{USERNAME}', { windowTitle: autotypeChooser.windowTitle }).catch((e) => console.error('AutoType failed:', e))
                      }}
                      className="px-3 py-1.5 rounded-lg border border-accent-cool/20 text-xs text-text-secondary hover:text-text-primary hover:bg-white/10"
                    >
                      Username
                    </button>
                    <button
                      onClick={() => {
                        setAutotypeChooser(null)
                        performAutotype(candidate.entry, '{PASSWORD}', { windowTitle: autotypeChooser.windowTitle }).catch((e) => console.error('AutoType failed:', e))
                      }}
                      className="px-3 py-1.5 rounded-lg border border-accent-cool/20 text-xs text-text-secondary hover:text-text-primary hover:bg-white/10"
                    >
                      Password
                    </button>
                    <button
                      onClick={() => {
                        setAutotypeChooser(null)
                        performAutotype(candidate.entry, '{TOTP}', { windowTitle: autotypeChooser.windowTitle }).catch((e) => console.error('AutoType failed:', e))
                      }}
                      className="px-3 py-1.5 rounded-lg border border-accent-cool/20 text-xs text-text-secondary hover:text-text-primary hover:bg-white/10"
                    >
                      TOTP
                    </button>
                    <button
                      onClick={() => {
                        setAutotypeChooser(null)
                        performAutotype(candidate.entry, '{URL}', { windowTitle: autotypeChooser.windowTitle }).catch((e) => console.error('AutoType failed:', e))
                      }}
                      className="px-3 py-1.5 rounded-lg border border-accent-cool/20 text-xs text-text-secondary hover:text-text-primary hover:bg-white/10"
                    >
                      URL
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-text-secondary">
                  No entries matched this search.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
