import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Tab,
  Tabs,
  Slider,
  FormControlLabel,
  Switch,
  Button,
  Paper,
} from '@mui/material'
import Refresh from '@mui/icons-material/Refresh'
import ContentCopy from '@mui/icons-material/ContentCopy'
import Check from '@mui/icons-material/Check'
import VpnKey from '@mui/icons-material/VpnKey'

// Word list for passphrase generation (outside component to avoid dependency issues)
const wordList = [
  'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'abuse',
  'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire',
  'across', 'act', 'action', 'active', 'actor', 'actual', 'adapt', 'add',
  'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advent', 'advent',
  'adverb', 'advice', 'advise', 'affair', 'afford', 'afraid', 'after', 'again',
  'against', 'age', 'agent', 'agree', 'ahead', 'aim', 'air', 'alarm',
  'album', 'alcohol', 'alert', 'alien', 'align', 'alike', 'alive', 'all',
  'alley', 'allow', 'almost', 'alone', 'along', 'aloud', 'alpha', 'already',
  'also', 'alter', 'always', 'am', 'amateur', 'amazing', 'ambiguity', 'ambition',
  'ambulance', 'amend', 'america', 'among', 'amount', 'amused', 'amusement', 'an'
]

export default function PasswordGenerator() {
  const [tab, setTab] = useState(0)
  const [password, setPassword] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [username, setUsername] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedType, setCopiedType] = useState(null)

  // Password Tab State
  const [length, setLength] = useState(20)
  const [uppercase, setUppercase] = useState(true)
  const [lowercase, setLowercase] = useState(true)
  const [numbers, setNumbers] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [ambiguous, setAmbiguous] = useState(false)

  // Passphrase Tab State
  const [wordCount, setWordCount] = useState(5)
  const [separator, setSeparator] = useState(' ')

  const initializedRef = useRef(false)

  const generatePassword = useCallback(() => {
    let chars = ''
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
    if (numbers) chars += '0123456789'
    if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'
    if (ambiguous) chars = chars.replace(/[0OIl1]/g, '')

    if (chars === '') {
      setPassword('')
      return
    }

    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(result)
  }, [length, uppercase, lowercase, numbers, symbols, ambiguous])

  const generatePassphrase = useCallback(() => {
    const words = []
    for (let i = 0; i < wordCount; i++) {
      const word = wordList[Math.floor(Math.random() * wordList.length)]
      words.push(word)
    }
    setPassphrase(words.join(separator))
  }, [wordCount, separator])

  const generateUsername = useCallback(() => {
    const adjectives = ['swift', 'bright', 'smart', 'clever', 'quick', 'brave', 'wild', 'calm']
    const nouns = ['eagle', 'tiger', 'dragon', 'phoenix', 'wolf', 'falcon', 'raven', 'lion']
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const num = Math.floor(Math.random() * 999)
    setUsername(`${adj}_${noun}${num}`)
  }, [])

  useEffect(() => {
    if (!initializedRef.current) {
      generatePassword()
      generatePassphrase()
      generateUsername()
      initializedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (initializedRef.current) {
      generatePassword()
    }
  }, [length, uppercase, lowercase, numbers, symbols, ambiguous, generatePassword])

  useEffect(() => {
    if (initializedRef.current) {
      generatePassphrase()
    }
  }, [wordCount, separator, generatePassphrase])

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setCopiedType(type)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStrength = () => {
    if (length >= 24 && uppercase && lowercase && numbers && symbols) {
      return { label: 'Very strong', color: '#7a8a6f', percentage: 100 }
    }
    if (length >= 20 && uppercase && lowercase && numbers && symbols) {
      return { label: 'Strong', color: '#8ab04f', percentage: 80 }
    }
    if (length >= 16 && uppercase && lowercase && numbers) {
      return { label: 'Good', color: '#a89968', percentage: 60 }
    }
    if (length >= 12 && uppercase && lowercase) {
      return { label: 'Fair', color: '#d4a574', percentage: 40 }
    }
    return { label: 'Weak', color: '#a85a5a', percentage: 20 }
  }

  const strength = getStrength()

  return (
    <Box
      className="flex-1 overflow-y-auto p-8"
      sx={{
        color: '#e8dcc8',
        '& .text-text-primary': { color: '#e8dcc8 !important' },
        '& .text-text-secondary': { color: '#b8a98a !important' },
        '& .text-accent-cool': { color: '#8a9fb9 !important' },
        '& .MuiFormControlLabel-label': { color: '#e8dcc8' },
        '& select': {
          backgroundColor: 'rgba(10, 14, 18, 0.95)',
          color: '#e8dcc8',
          borderColor: 'rgba(138, 159, 185, 0.45)',
        },
        '& option': {
          backgroundColor: '#10151d',
          color: '#e8dcc8',
        },
      }}
    >
      <Box className="max-w-3xl">
        {/* Header */}
        <Box className="flex items-center space-x-3 mb-8">
          <Box
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
            sx={{
              backgroundColor: '#8a9fb9',
              color: 'white',
            }}
          >
            <VpnKey sx={{ fontSize: 28 }} />
          </Box>
          <h2 className="text-3xl font-bold text-accent-cool">Generator</h2>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            borderBottom: '1px solid rgba(138, 159, 185, 0.2)',
            marginBottom: '2rem',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: '#a89968',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                padding: '12px 24px',
                minWidth: '140px',
              },
              '& .MuiTab-root.Mui-selected': {
                color: '#e8dcc8',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#8a9fb9',
                height: '3px',
              },
            }}
          >
            <Tab label="Password" />
            <Tab label="Passphrase" />
            <Tab label="Username" />
          </Tabs>
        </Box>

        {/* Password Tab */}
        {tab === 0 && (
          <Box>
            {/* Generated Password Display */}
            <Paper
              sx={{
                backgroundColor: 'rgba(20, 24, 30, 0.92)',
                border: '1px solid rgba(138, 159, 185, 0.45)',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
                color: '#e8dcc8',
              }}
            >
              <Box className="flex items-center justify-between mb-4">
                <span className="text-sm text-text-secondary uppercase tracking-wider">Generated Password</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => generatePassword()}
                  className="text-accent-cool hover:text-text-primary transition"
                >
                  <Refresh sx={{ fontSize: '1.25rem' }} />
                </motion.button>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(10, 14, 18, 0.95)',
                  border: '1px solid rgba(138, 159, 185, 0.45)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <span
                  className="font-mono text-text-primary text-lg break-all"
                >
                  {password}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyToClipboard(password, 'password')}
                  className="ml-4 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg transition"
                  style={{
                    backgroundColor: 'rgba(138, 159, 185, 0.2)',
                    color: '#8a9fb9',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(138, 159, 185, 0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(138, 159, 185, 0.2)'}
                >
                  {copied && copiedType === 'password' ? (
                    <Check sx={{ fontSize: '1.25rem' }} />
                  ) : (
                    <ContentCopy sx={{ fontSize: '1.25rem' }} />
                  )}
                </motion.button>
              </Box>

              {/* Strength Indicator */}
              <Box>
                <span className="text-xs text-text-secondary uppercase tracking-wider">Strength</span>
                <Box className="flex items-center justify-between mt-2">
                  <Box className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'rgba(138, 159, 185, 0.2)' }}>
                    <Box
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${strength.percentage}%`,
                        backgroundColor: strength.color,
                      }}
                    />
                  </Box>
                  <span
                    className="ml-4 text-sm font-semibold"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </Box>
              </Box>
            </Paper>

            {/* Options */}
            <Paper
              sx={{
                backgroundColor: 'rgba(20, 24, 30, 0.92)',
                border: '1px solid rgba(138, 159, 185, 0.45)',
                borderRadius: '8px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                color: '#e8dcc8',
              }}
            >
              {/* Length Slider */}
              <Box>
                <Box className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Length</label>
                  <span className="text-lg font-bold text-accent-cool">{length}</span>
                </Box>
                <Slider
                  value={length}
                  onChange={(_, newValue) => setLength(newValue)}
                  min={1}
                  max={50}
                  sx={{
                    color: '#8a9fb9',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#8a9fb9',
                      border: '2px solid #0d0d0d',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#8a9fb9',
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: 'rgba(138, 159, 185, 0.2)',
                    },
                  }}
                />
              </Box>

              {/* Character Types */}
              <Box className="space-y-3">
                <FormControlLabel
                  control={
                    <Switch
                      checked={uppercase}
                      onChange={(e) => setUppercase(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase': {
                          color: '#a89968',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#8a9fb9',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#8a9fb9',
                        },
                      }}
                    />
                  }
                  label={
                    <span className="text-sm font-semibold text-text-primary">Uppercase (A-Z)</span>
                  }
                  sx={{ margin: 0 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={lowercase}
                      onChange={(e) => setLowercase(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase': {
                          color: '#a89968',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#8a9fb9',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#8a9fb9',
                        },
                      }}
                    />
                  }
                  label={
                    <span className="text-sm font-semibold text-text-primary">Lowercase (a-z)</span>
                  }
                  sx={{ margin: 0 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={numbers}
                      onChange={(e) => setNumbers(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase': {
                          color: '#a89968',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#8a9fb9',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#8a9fb9',
                        },
                      }}
                    />
                  }
                  label={
                    <span className="text-sm font-semibold text-text-primary">Numbers (0-9)</span>
                  }
                  sx={{ margin: 0 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={symbols}
                      onChange={(e) => setSymbols(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase': {
                          color: '#a89968',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#8a9fb9',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#8a9fb9',
                        },
                      }}
                    />
                  }
                  label={
                    <span className="text-sm font-semibold text-text-primary">Symbols (@#$...!%^&)</span>
                  }
                  sx={{ margin: 0 }}
                />

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={ambiguous}
                        onChange={(e) => setAmbiguous(e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase': {
                            color: '#a89968',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#8a9fb9',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#8a9fb9',
                          },
                        }}
                      />
                    }
                    label={
                      <span className="text-sm font-semibold text-text-primary">Avoid ambiguous</span>
                    }
                    sx={{ margin: 0 }}
                  />
                  <p className="text-xs text-text-secondary ml-12">Skip O, 0, I, l, 1</p>
                </Box>
              </Box>

              {/* Regenerate Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => generatePassword()}
                  fullWidth
                  sx={{
                    padding: '12px 24px',
                    backgroundColor: '#8a9fb9',
                    color: '#0d0d0d',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    '&:hover': {
                      backgroundColor: '#9ab0ca',
                    },
                  }}
                  startIcon={<Refresh />}
                >
                  Regenerate
                </Button>
              </motion.div>
            </Paper>
          </Box>
        )}

        {/* Passphrase Tab */}
        {tab === 1 && (
          <Box>
            {/* Generated Passphrase Display */}
            <Paper
              sx={{
                backgroundColor: 'rgba(20, 24, 30, 0.92)',
                border: '1px solid rgba(138, 159, 185, 0.45)',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
                color: '#e8dcc8',
              }}
            >
              <Box className="flex items-center justify-between mb-4">
                <span className="text-sm text-text-secondary uppercase tracking-wider">Generated Passphrase</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => generatePassphrase()}
                  className="text-accent-cool hover:text-text-primary transition"
                >
                  <Refresh sx={{ fontSize: '1.25rem' }} />
                </motion.button>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(10, 14, 18, 0.95)',
                  border: '1px solid rgba(138, 159, 185, 0.45)',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <span
                  className="font-mono text-text-primary text-lg break-all"
                >
                  {passphrase}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyToClipboard(passphrase, 'passphrase')}
                  className="ml-4 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg transition"
                  style={{
                    backgroundColor: 'rgba(138, 159, 185, 0.2)',
                    color: '#8a9fb9',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(138, 159, 185, 0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(138, 159, 185, 0.2)'}
                >
                  {copied && copiedType === 'passphrase' ? (
                    <Check sx={{ fontSize: '1.25rem' }} />
                  ) : (
                    <ContentCopy sx={{ fontSize: '1.25rem' }} />
                  )}
                </motion.button>
              </Box>
            </Paper>

            {/* Passphrase Options */}
            <Paper
              sx={{
                backgroundColor: 'rgba(20, 24, 30, 0.92)',
                border: '1px solid rgba(138, 159, 185, 0.45)',
                borderRadius: '8px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                color: '#e8dcc8',
              }}
            >
              {/* Word Count Slider */}
              <Box>
                <Box className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Word Count</label>
                  <span className="text-lg font-bold text-accent-cool">{wordCount}</span>
                </Box>
                <Slider
                  value={wordCount}
                  onChange={(_, newValue) => setWordCount(newValue)}
                  min={3}
                  max={10}
                  sx={{
                    color: '#8a9fb9',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#8a9fb9',
                      border: '2px solid #0d0d0d',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#8a9fb9',
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: 'rgba(138, 159, 185, 0.2)',
                    },
                  }}
                />
              </Box>

              {/* Separator Dropdown */}
              <Box>
                <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider block mb-2">Separator</label>
                <select
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-bg-primary text-text-primary border border-accent-cool/30 focus:outline-none focus:border-accent-cool/60 transition"
                >
                  <option value=" ">Space</option>
                  <option value="-">Dash (-)</option>
                  <option value="_">Underscore (_)</option>
                  <option value=".">Period (.)</option>
                </select>
              </Box>

              {/* Regenerate Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => generatePassphrase()}
                  fullWidth
                  sx={{
                    padding: '12px 24px',
                    backgroundColor: '#8a9fb9',
                    color: '#0d0d0d',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    '&:hover': {
                      backgroundColor: '#9ab0ca',
                    },
                  }}
                  startIcon={<Refresh />}
                >
                  Regenerate
                </Button>
              </motion.div>
            </Paper>
          </Box>
        )}

        {/* Username Tab */}
        {tab === 2 && (
          <Box>
            {/* Generated Username Display */}
            <Paper
              sx={{
                backgroundColor: 'rgba(20, 24, 30, 0.92)',
                border: '1px solid rgba(138, 159, 185, 0.45)',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
                color: '#e8dcc8',
              }}
            >
              <Box className="flex items-center justify-between mb-4">
                <span className="text-sm text-text-secondary uppercase tracking-wider">Generated Username</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => generateUsername()}
                  className="text-accent-cool hover:text-text-primary transition"
                >
                  <Refresh sx={{ fontSize: '1.25rem' }} />
                </motion.button>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(10, 14, 18, 0.95)',
                  border: '1px solid rgba(138, 159, 185, 0.45)',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <span
                  className="font-mono text-text-primary text-lg break-all"
                >
                  {username}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyToClipboard(username, 'username')}
                  className="ml-4 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg transition"
                  style={{
                    backgroundColor: 'rgba(138, 159, 185, 0.2)',
                    color: '#8a9fb9',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(138, 159, 185, 0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(138, 159, 185, 0.2)'}
                >
                  {copied && copiedType === 'username' ? (
                    <Check sx={{ fontSize: '1.25rem' }} />
                  ) : (
                    <ContentCopy sx={{ fontSize: '1.25rem' }} />
                  )}
                </motion.button>
              </Box>
            </Paper>

            {/* Regenerate Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => generateUsername()}
                fullWidth
                sx={{
                  padding: '12px 24px',
                  backgroundColor: '#8a9fb9',
                  color: '#0d0d0d',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  '&:hover': {
                    backgroundColor: '#9ab0ca',
                  },
                }}
                startIcon={<Refresh />}
              >
                Regenerate
              </Button>
            </motion.div>
          </Box>
        )}
      </Box>
    </Box>
  )
}
