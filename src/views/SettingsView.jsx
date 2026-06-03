import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { invoke } from '@tauri-apps/api/core'
import PersonIcon from '@mui/icons-material/Person'
import LockIcon from '@mui/icons-material/Lock'
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import WarningIcon from '@mui/icons-material/Warning'
import SparklesIcon from '@mui/icons-material/Brightness4'
import KeyboardIcon from '@mui/icons-material/Keyboard'

export default function SettingsView({ user, onBack, onLogout }) {
  const [pin, setPin] = useState('')
  const [twoFactor, setTwoFactor] = useState(true)
  const [biometric, setBiometric] = useState(true)
  const [vaultTimeout, setVaultTimeout] = useState('15')
  const [theme, setTheme] = useState('dark')
  const [autoFill, setAutoFill] = useState(true)
  const [pinSet, setPinSet] = useState(false)

  // Autotype / Hotkeys
  const [hotkeys, setHotkeys] = useState([])
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false)
  const [capturedHotkey, setCapturedHotkey] = useState('')
  const [newAction, setNewAction] = useState('autotype')
  const [clipboardTimeout, setClipboardTimeout] = useState(8)


  const handleSetPin = () => {
    if (pin.length === 4 || pin.length === 6) {
      setPinSet(true)
      setTimeout(() => setPin(''), 2000)
    }
  }

  // Hotkey capture effect - captures full key combinations like Cmd+Shift+V
  useEffect(() => {
    if (!isCapturingHotkey) return

    const keyState = { modifiers: new Set(), nonModifierKeys: [] }

    const handleKeyDown = (e) => {
      e.preventDefault()
      e.stopPropagation()

      const keyName = e.key

      // Track modifier states
      if (keyName === 'Meta' || keyName === 'Control' || keyName === 'Shift' || keyName === 'Alt') {
        if (keyName === 'Meta') keyState.modifiers.add('Cmd')
        if (keyName === 'Control') keyState.modifiers.add('Ctrl')
        if (keyName === 'Shift') keyState.modifiers.add('Shift')
        if (keyName === 'Alt') keyState.modifiers.add('Alt')
      } else {
        // Non-modifier key - add if not already in list
        const displayKey = keyName.length === 1 ? keyName.toUpperCase() : keyName
        if (!keyState.nonModifierKeys.includes(displayKey)) {
          keyState.nonModifierKeys.push(displayKey)
        }
      }

      // Build hotkey string: modifiers + non-modifier keys
      const keys = Array.from(keyState.modifiers)
      keys.push(...keyState.nonModifierKeys)
      setCapturedHotkey(keys.join('+'))
    }

    const handleKeyUp = (e) => {
      e.preventDefault()
      e.stopPropagation()

      const keyName = e.key

      // Remove modifier from set when released
      if (keyName === 'Meta') keyState.modifiers.delete('Cmd')
      if (keyName === 'Control') keyState.modifiers.delete('Ctrl')
      if (keyName === 'Shift') keyState.modifiers.delete('Shift')
      if (keyName === 'Alt') keyState.modifiers.delete('Alt')

      // If no modifiers and we have a non-modifier key, finalize the hotkey
      if (keyState.modifiers.size === 0 && keyState.nonModifierKeys.length > 0) {
        setIsCapturingHotkey(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [isCapturingHotkey])

  // Load hotkeys and clipboard timeout on mount
  useEffect(() => {
    (async () => {
      try {
        const list = await invoke('list_hotkeys')
        if (Array.isArray(list)) setHotkeys(list)
      } catch (e) {
        console.warn('Could not list hotkeys', e)
      }
      try {
        const t = await invoke('get_clipboard_timeout')
        setClipboardTimeout(Number(t) || 8)
      } catch (e) {
        console.warn('Could not get clipboard timeout', e)
      }
    })()
  }, [])

  const registerHotkey = async () => {
    if (!capturedHotkey) return alert('Capture a hotkey first')
    try {
    // store in backend map
    await invoke('register_hotkey', { hotkey: capturedHotkey, action: newAction })
    // also request OS registration
    try {
      await invoke('register_os_hotkey', { hotkey: capturedHotkey, action: newAction })
    } catch (err) {
      console.warn('OS hotkey registration failed (will still keep in settings):', err)
    }
    const list = await invoke('list_hotkeys')
    setHotkeys(list)
    setCapturedHotkey('')
    alert('Hotkey registered')
  } catch (e) {
    alert('Failed to register hotkey: ' + e)
  }
  }

  const unregisterHotkey = async (hk) => {
    try {
      await invoke('unregister_hotkey', { hotkey: hk })
      const list = await invoke('list_hotkeys')
      setHotkeys(list)
    } catch (e) {
      alert('Failed to remove hotkey: ' + e)
    }
  }

  const updateClipboardTimeout = async (v) => {
    try {
      await invoke('set_clipboard_timeout', { seconds: Number(v) })
      setClipboardTimeout(Number(v))
    } catch (e) {
      alert('Failed to set timeout: ' + e)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="border-b border-border-light p-6 flex items-center space-x-4"
      >
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary transition text-xl"
        >
          ←
        </button>
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Account Section */}
          <SettingsSection title="Account" icon={PersonIcon}>
            <SettingRow
              label="Email Address"
              description={user.email}
              type="text"
              disabled
            />
            <div className="border-t border-border-light pt-4 mt-4">
              <button
                onClick={() => {}}
                className="px-4 py-2 border border-border-light text-text-primary rounded hover:bg-bg-secondary transition"
              >
                Change Master Password
              </button>
            </div>
          </SettingsSection>

          {/* Security Section */}
          <SettingsSection title="Security" icon={LockIcon}>
            {/* PIN Setup */}
            <div className="border-b border-border-light pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-text-primary">PIN Login</p>
                  <p className="text-sm text-text-muted">Use a 4-6 digit PIN for quick unlock</p>
                </div>
                {!pinSet && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.slice(0, 6))}
                      placeholder="Enter PIN (4-6 digits)"
                      maxLength="6"
                      className="px-3 py-1 bg-bg-secondary border border-border-light rounded text-text-primary text-center w-32 focus:outline-none focus:ring-2 focus:ring-accent-cool"
                    />
                    <button
                      onClick={handleSetPin}
                      disabled={pin.length < 4}
                      className="px-3 py-1 bg-accent-cool text-bg-dark rounded disabled:opacity-50 transition"
                    >
                      Set
                    </button>
                  </div>
                )}
                {pinSet && (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center space-x-1 text-accent-green"
                  >
                    <span>✓</span>
                    <span className="text-sm">PIN Set</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* 2FA */}
            <SettingToggle
              label="Two-Step Login"
              description="TOTP authenticator"
              enabled={twoFactor}
              onChange={setTwoFactor}
            />

            {/* Biometric */}
            <SettingToggle
              label="Biometric Unlock"
              description="Use fingerprint or face recognition"
              enabled={biometric}
              onChange={setBiometric}
            />

            {/* Vault Timeout */}
            <div className="border-t border-border-light pt-4 mt-4">
              <p className="font-semibold text-text-primary mb-2">Vault Timeout</p>
              <select
                value={vaultTimeout}
                onChange={(e) => setVaultTimeout(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-light rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cool"
              >
                <option value="1">1 minute</option>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="never">Never</option>
              </select>
            </div>
          </SettingsSection>

          {/* Encryption Section */}
          <SettingsSection title="Encryption" icon={QueryBuilderIcon}>
            <div className="space-y-3">
              <EncryptionDetail
                name="Post-Quantum Algorithm"
                value="ML-KEM-768"
                status="active"
              />
              <EncryptionDetail
                name="Symmetric Cipher"
                value="AES-256-GCM"
                status="active"
              />
              <EncryptionDetail
                name="Key Derivation"
                value="Argon2id (KDF)"
                status="active"
              />
            </div>
            <div className="border-t border-border-light pt-4 mt-4">
              <p className="text-xs text-text-muted">
                Your vault is protected by multiple layers of encryption designed to remain secure even against quantum computers. Learn more about our security architecture.
              </p>
            </div>
          </SettingsSection>

          {/* Features Section */}
          <SettingsSection title="Features" icon={SparklesIcon}>
            <SettingToggle
              label="Auto-fill"
              description="Automatically fill passwords in browsers"
              enabled={autoFill}
              onChange={setAutoFill}
            />
            <SettingToggle
              label="Password Generator"
              description="Generate strong passwords"
              enabled={true}
              onChange={() => {}}
            />
          </SettingsSection>

          {/* AutoType & Hotkeys Section */}
          <SettingsSection title="AutoType & Hotkeys" icon={KeyboardIcon}>
            <div className="space-y-3">
              <p className="text-sm text-text-muted">Registered global hotkeys</p>
              <div className="space-y-2">
                {hotkeys.length === 0 && <p className="text-xs text-text-muted">No hotkeys registered</p>}
                {hotkeys.map(([hk, action], idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-bg-secondary rounded border border-border-light">
                    <div>
                      <div className="font-semibold text-text-primary text-sm">{hk}</div>
                      <div className="text-xs text-text-muted capitalize">{action.replace(/_/g, ' ')}</div>
                    </div>
                    <button
                      onClick={() => unregisterHotkey(hk)}
                      className="p-2 text-status-error hover:bg-status-error/10 rounded transition"
                      title="Delete hotkey"
                    >
                      <DeleteIcon fontSize="small" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-border-light pt-4 mt-4">
                <p className="font-semibold text-text-primary mb-3">Register new hotkey</p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setCapturedHotkey('')
                        setIsCapturingHotkey(true)
                      }}
                      className={`flex-1 px-4 py-2 rounded border transition font-medium ${
                        isCapturingHotkey
                          ? 'border-accent-cool bg-accent-cool/10 text-accent-cool'
                          : capturedHotkey
                            ? 'border-accent-green bg-accent-green/10 text-accent-green'
                            : 'border-border-light text-text-primary hover:bg-bg-secondary'
                      }`}
                    >
                      {isCapturingHotkey ? 'Press any key...' : capturedHotkey || 'Click to record'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      className="px-3 py-2 bg-bg-secondary border border-border-light rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-cool"
                    >
                      <option value="autotype">AutoType</option>
                      <option value="copy_username">Copy Username</option>
                      <option value="copy_password">Copy Password</option>
                    </select>
                    <button
                      onClick={registerHotkey}
                      disabled={!capturedHotkey}
                      className="px-4 py-2 bg-accent-cool text-bg-dark rounded disabled:opacity-50 font-medium transition hover:bg-accent-cool/90"
                    >
                      Register
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-border-light pt-4 mt-4">
                <p className="font-semibold text-text-primary mb-2">Clipboard clear timeout</p>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={clipboardTimeout}
                    onChange={(e) => updateClipboardTimeout(e.target.value)}
                    className="flex-1"
                  />
                  <div className="w-16 text-right text-sm text-text-muted font-mono">{clipboardTimeout}s</div>
                </div>
                <p className="text-xs text-text-muted mt-2">Clipboard will be cleared after this duration following copy/autotype.</p>
              </div>
            </div>
          </SettingsSection>

          {/* Appearance Section */}
          <SettingsSection title="Appearance" icon={VisibilityIcon}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-text-primary">Theme</p>
                <p className="text-sm text-text-muted">Choose your preferred appearance</p>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="px-3 py-2 bg-bg-secondary border border-border-light rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cool"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>
          </SettingsSection>

          {/* Danger Zone */}
          <SettingsSection title="Account Actions" icon={WarningIcon}>
            <button
              onClick={onLogout}
              className="w-full px-4 py-3 border border-status-error text-status-error rounded hover:bg-bg-secondary transition font-semibold"
            >
              Logout
            </button>
            <button className="w-full px-4 py-3 mt-2 border border-status-error text-status-error rounded hover:bg-bg-secondary transition">
              Delete Account
            </button>
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ title, icon: IconComponent, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border-light rounded-lg p-6"
    >
      <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center space-x-2">
        <IconComponent className="text-text-primary" />
        <span>{title}</span>
      </h2>
      <div className="space-y-4">{children}</div>
    </motion.div>
  )
}

function SettingRow({ label, description, type, disabled, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light last:border-0">
      <div>
        <p className="font-semibold text-text-primary">{label}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      {type === 'text' && (
        <input
          type="text"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="px-3 py-1 bg-bg-secondary border border-border-light rounded text-text-primary disabled:opacity-50"
        />
      )}
    </div>
  )
}

function SettingToggle({ label, description, enabled, onChange }) {
  return (
    <motion.div className="flex items-center justify-between py-3 border-b border-border-light last:border-0">
      <div>
        <p className="font-semibold text-text-primary">{label}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <motion.button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          enabled ? 'bg-accent-cool' : 'bg-bg-secondary border border-border-light'
        }`}
      >
        <motion.span
          animate={{ x: enabled ? 20 : 2 }}
          className="h-4 w-4 rounded-full bg-white"
        />
      </motion.button>
    </motion.div>
  )
}

function EncryptionDetail({ name, value, status }) {
  return (
    <div className="flex items-center justify-between p-3 bg-bg-secondary rounded border border-border-light">
      <div>
        <p className="text-sm font-semibold text-text-primary">{name}</p>
        <p className="text-xs text-text-muted font-mono">{value}</p>
      </div>
      <span className={`text-xs font-semibold px-2 py-1 rounded ${
        status === 'active' ? 'text-accent-green bg-accent-green/10' : 'text-text-muted'
      }`}>
        {status === 'active' ? '✓ Active' : 'Inactive'}
      </span>
    </div>
  )
}
