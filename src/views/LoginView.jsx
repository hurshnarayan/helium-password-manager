import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LoginView({ onLogin, loading }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showEncryption, setShowEncryption] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setShowEncryption(true)
    
    // Show animation for 2 seconds
    setTimeout(() => {
      onLogin(email, password)
      setShowEncryption(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-dark p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full border-2 border-accent-cool mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-accent-cool" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">Helium</h1>
          <p className="text-text-secondary">Quantum-safe password manager</p>
        </motion.div>

        {/* Encryption Animation */}
        {showEncryption && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-6 bg-bg-secondary rounded-lg border border-border-light"
          >
            <div className="space-y-4">
              {/* Layer 1: KDF */}
              <EncryptionLayer
                label="KEY DERIVATION"
                icon="🔑"
                color="text-accent-cool"
                delay={0}
                duration={0.6}
              />
              
              {/* Layer 2: AES */}
              <EncryptionLayer
                label="SYMMETRIC CIPHER"
                icon="🔐"
                color="text-accent-warm"
                delay={0.3}
                duration={0.6}
              />
              
              {/* Layer 3: Quantum-Safe */}
              <EncryptionLayer
                label="QUANTUM-SAFE LAYER"
                icon="⚛️"
                color="text-accent-green"
                delay={0.6}
                duration={0.6}
              />
            </div>
          </motion.div>
        )}

        {/* Login Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          {/* Email Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 bg-bg-tertiary border border-border-light rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-cool transition"
            />
          </div>

          {/* Master Password Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border-light rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-cool transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11 10.07 7.5 12 7.5s3.5 1.57 3.5 3.5z" />
                  ) : (
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Login Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-4 py-3 bg-accent-cool text-bg-dark font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition mt-6"
          >
            {loading ? 'Encrypting...' : 'Login'}
          </motion.button>
        </motion.form>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center text-text-muted text-sm mt-6"
        >
          Your master password is never stored on servers
        </motion.p>
      </div>
    </div>
  )
}

function EncryptionLayer({ label, icon, color, delay, duration }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration }}
      className="flex items-center space-x-3 p-3 bg-bg-dark rounded border border-border-light"
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 text-left">
        <p className={`text-xs font-semibold tracking-wider ${color}`}>{label}</p>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.5 }}
          className={`h-1 rounded origin-left mt-1 ${color.replace('text-', 'bg-')}`}
        />
      </div>
      <motion.svg
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-4 h-4 text-text-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </motion.svg>
    </motion.div>
  )
}
