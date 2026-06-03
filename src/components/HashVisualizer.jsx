import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { NotificationDisplay } from './Notification'
import { useNotification } from './useNotification'
import { invoke } from '@tauri-apps/api/core'

export default function HashVisualizer({ entry, masterKey, itemIndex, userEmail }) {
  const [expandedLayer, setExpandedLayer] = useState(null)
  const [showRawHash, setShowRawHash] = useState(false)
  const [encryptionMetadata, setEncryptionMetadata] = useState(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [metadataError, setMetadataError] = useState(null)
  const { notification, notify } = useNotification()

  useEffect(() => {
    const formatError = (error) => {
      if (typeof error === 'string') return error
      if (error?.message) return error.message
      return 'Failed to load encryption metadata'
    }

    // Fetch per-item encryption metadata from backend
    const fetchMetadata = async () => {
      if (!userEmail) {
        setMetadataError('Missing user context for metadata lookup')
        setEncryptionMetadata(null)
        setLoadingMetadata(false)
        return
      }

      if (!Number.isInteger(itemIndex) || itemIndex < 0) {
        setMetadataError('Could not resolve selected item metadata')
        setEncryptionMetadata(null)
        setLoadingMetadata(false)
        return
      }

      try {
        setLoadingMetadata(true)
        setMetadataError(null)
        const metadata = await invoke('get_encryption_metadata', {
          email: userEmail,
          itemIndex
        })
        setEncryptionMetadata(metadata)
      } catch (error) {
        console.error('Failed to fetch encryption metadata:', error)
        setMetadataError(formatError(error))
      } finally {
        setLoadingMetadata(false)
      }
    }

    fetchMetadata()
  }, [itemIndex, userEmail])

  // Use fetched metadata if available, fallback to masterKey prop
  const metadata = encryptionMetadata || masterKey

  // Per-item encryption layer data with safe fallbacks
  const layers = [
    {
      id: 'layer1',
      name: 'Layer 1: Key Derivation (Argon2id)',
      description: 'Master password + salt → Key material via Argon2id (part of combined key)',
      color: 'accent-cool',
      progress: 33,
      hash: (metadata && metadata.encrypted) ? (metadata.kdf_hash || 'Unavailable') : 'Unavailable',
      details: {
        algorithm: 'Argon2id',
        iterations: metadata?.kdf_params?.iterations || 3,
        memory: metadata?.kdf_params?.memory_kb ? `${metadata.kdf_params.memory_kb} KB` : 'Unknown',
        parallelism: metadata?.kdf_params?.parallelism ? `${metadata.kdf_params.parallelism} threads` : 'Unknown',
        salt: (metadata && metadata.encrypted && metadata.kdf_hash) ? metadata.kdf_hash.slice(0, 16) : 'Unavailable'
      }
    },
    {
      id: 'layer2',
      name: 'Layer 2: Quantum-Safe Encapsulation (ML-KEM)',
      description: 'Public key → Shared secret via ML-KEM (part of combined key)',
      color: 'accent-green',
      progress: 66,
      hash: (metadata && metadata.encrypted) ? (metadata.mlkem_ciphertext || 'Unavailable') : 'Unavailable',
      details: {
        algorithm: 'ML-KEM-768',
        keySize: '1184 bytes',
        ctextSize: metadata?.mlkem_ciphertext ? `${Math.ceil(metadata.mlkem_ciphertext.length / 2)} bytes` : 'Unknown',
        standardized: 'FIPS 203 (Post-Quantum)',
        category: 'Key Encapsulation Mechanism'
      }
    },
    {
      id: 'layer3',
      name: 'Layer 3: Symmetric Encryption (AES-256-GCM)',
      description: 'Data → Encrypted with XOR combined key (Argon2id ⊕ ML-KEM shared secret)',
      color: 'accent-warm',
      progress: 100,
      hash: (metadata && metadata.encrypted) ? (metadata.aes_ciphertext || 'Unavailable') : 'Unavailable',
      details: {
        algorithm: 'AES-256-GCM',
        keySize: '256 bits',
        nonce: metadata?.nonce || 'Unavailable',
        tagSize: '128 bits (authentication)',
        mode: 'Galois/Counter Mode'
      }
    }
  ]

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash)
      .then(() => {
        notify('Copied to clipboard', 'success', 2000)
      })
      .catch(() => {
        notify('Failed to copy', 'error', 2000)
      })
  }

  return (
    <div className="space-y-6">
      <NotificationDisplay notification={notification} />
      {loadingMetadata && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-accent-cool/10 border border-accent-cool/30 rounded-lg text-accent-cool text-sm"
        >
          ⏳ Loading encryption metadata...
        </motion.div>
      )}
      {metadataError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
        >
          ⚠️ {metadataError}
        </motion.div>
      )}
      {encryptionMetadata && encryptionMetadata.encrypted === false && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-yellow-800/10 border border-yellow-600/30 rounded-lg text-yellow-300 text-sm"
        >
          ⚠️ {encryptionMetadata.message || 'Vault is not encrypted; no encryption metadata available.'}
        </motion.div>
      )}
      {/* Overview Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-sm border border-accent-cool/30 rounded-xl shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg text-accent-cool mb-1">Encryption Details for: {entry.name}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Your password is encrypted through multiple layers. Click each layer to see details.
            </p>
          </div>
          <button
            onClick={() => setShowRawHash(!showRawHash)}
            className="text-xs px-3 py-2 border border-accent-cool/50 rounded-lg text-accent-cool hover:bg-accent-cool/10 hover:border-accent-cool/80 transition font-semibold whitespace-nowrap"
          >
            {showRawHash ? 'Hide Raw' : 'Show Raw'}
          </button>
        </div>
      </motion.div>

      {showRawHash && (
        <motion.pre className="mt-4 p-3 bg-bg-secondary border border-accent-cool/20 rounded text-xs text-text-primary max-h-64 overflow-auto font-mono">
          {JSON.stringify(encryptionMetadata || metadata, null, 2)}
        </motion.pre>
      )}

      {/* Encryption Pipeline Visualization */}
      <div className="space-y-3">
        {layers.map((layer, idx) => (
          <motion.div
            key={layer.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <button
              onClick={() => setExpandedLayer(expandedLayer === layer.id ? null : layer.id)}
              className="w-full text-left"
            >
              {/* Layer Header */}
              <motion.div
                whileHover={{ scale: 1.01, y: -2 }}
                className={`p-5 border rounded-xl cursor-pointer transition shadow-md ${
                  expandedLayer === layer.id 
                    ? 'bg-gradient-to-r from-white/15 to-white/5 border-accent-cool/50' 
                    : 'bg-gradient-to-r from-white/8 to-white/3 border-accent-cool/20 hover:border-accent-cool/40'
                }`}
              >
                <div className="flex items-center space-x-4">
                  {/* Layer Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-gradient-to-br ${
                    layer.color === 'accent-cool' ? 'from-blue-600 to-blue-500' :
                    layer.color === 'accent-warm' ? 'from-orange-600 to-orange-500' :
                    'from-green-600 to-green-500'
                  } shadow-lg text-white`}>
                    {idx + 1}
                  </div>

                  {/* Layer Info */}
                  <div className="flex-1">
                    <h4 className={`font-semibold text-text-primary text-${layer.color}`}>
                      {layer.name}
                    </h4>
                    <p className="text-sm text-text-muted mt-1">{layer.description}</p>
                  </div>

                  {/* Progress Indicator */}
                  <div className="w-16">
                    <div className="relative w-16 h-16 rounded-full flex items-center justify-center border-2" style={{
                      borderColor: layer.color === 'accent-cool' ? '#8a9fb9' : layer.color === 'accent-warm' ? '#b8956a' : '#7a8a6f'
                    }}>
                      <motion.svg
                        className="absolute inset-0"
                        style={{ width: '100%', height: '100%' }}
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke={layer.color === 'accent-cool' ? '#8a9fb9' : layer.color === 'accent-warm' ? '#b8956a' : '#7a8a6f'}
                          strokeWidth="3"
                          strokeDasharray={`${2.83 * layer.progress} ${283}`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                          opacity="0.3"
                        />
                      </motion.svg>
                      <span className="text-xs font-bold text-text-primary">{layer.progress}%</span>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <motion.span
                    animate={{ rotate: expandedLayer === layer.id ? 180 : 0 }}
                    className="text-text-muted"
                  >
                    ▼
                  </motion.span>
                </div>
              </motion.div>

              {/* Expanded Details */}
              {expandedLayer === layer.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 p-5 bg-gradient-to-b from-white/12 to-white/5 border border-t-0 border-accent-cool/30 rounded-b-xl space-y-5 shadow-lg"
                >
                  {/* Algorithm Details */}
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(layer.details).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs font-semibold text-text-secondary uppercase">{key}</p>
                        <p className="text-sm text-text-primary font-mono">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Hash Value */}
                  <div>
                    <p className="text-xs font-semibold text-accent-cool uppercase tracking-widest mb-3">Hash/Ciphertext</p>
                    <div className="relative">
                      <div className="p-4 bg-white/8 border border-accent-cool/20 rounded-lg font-mono text-xs text-accent-cool break-all max-h-28 overflow-y-auto shadow-inner">
                        {showRawHash || layer.hash.length <= 24 ? layer.hash : layer.hash.slice(0, 24) + '...'}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (layer.hash !== 'Unavailable') handleCopyHash(layer.hash)
                        }}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-accent-cool/30 hover:bg-accent-cool/50 text-accent-cool transition flex items-center justify-center"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                        </svg>
                      </motion.button>
                    </div>
                  </div>

                  {/* Layer Explanation */}
                  <div className="p-4 bg-white/8 border border-accent-cool/20 rounded-lg shadow-inner">
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {idx === 0 && (
                        <>Your master password is transformed into key material using Argon2id with memory-hard parameters. This becomes part of your final encryption key (combined with ML-KEM via XOR). This ensures only you can derive the key—it's never stored.</>
                      )}
                      {idx === 1 && (
                        <>ML-KEM-768 generates a post-quantum shared secret that's combined with your password-derived key via XOR. This creates the final 256-bit key, making your data secure against both classical AND quantum computers. The ML-KEM ciphertext is stored and can only be decapsulated with the secret key.</>
                      )}
                      {idx === 2 && (
                        <>Your actual vault data is encrypted with the combined key (Argon2id ⊕ ML-KEM) using AES-256-GCM. The authentication tag proves data integrity. This 3-layer approach—password + quantum-safe + symmetric encryption—provides ultimate protection.</>
                      )}
                    </p>
                  </div>
                </motion.div>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Security Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 bg-gradient-to-r from-green-600/20 to-green-700/10 border-l-4 border-green-500/60 border border-green-500/30 rounded-xl shadow-lg"
      >
        <p className="text-xs font-bold text-green-400 uppercase tracking-widest">🔒 Quantum-Safe Security Guarantee</p>
        <p className="text-sm text-text-primary mt-3 leading-relaxed font-medium">
          Your data uses true quantum-safe encryption: Argon2id (password-based key) ⊕ ML-KEM-768 (quantum-resistant shared secret) = final key for AES-256-GCM. The server stores ciphertexts only. Without your master password AND the ML-KEM secret key, no one—not even Helium developers—can access your vault. Secure against both classical and quantum computers.
        </p>
      </motion.div>
    </div>
  )
}
