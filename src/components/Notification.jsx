import { motion } from 'framer-motion'

export function NotificationDisplay({ notification }) {
  if (!notification) return null

  const getColor = () => {
    switch (notification.type) {
      case 'success':
        return 'from-green-600/80 to-green-700/60 border-green-500/50'
      case 'error':
        return 'from-red-600/80 to-red-700/60 border-red-500/50'
      case 'info':
        return 'from-blue-600/80 to-blue-700/60 border-blue-500/50'
      default:
        return 'from-accent-cool/80 to-accent-cool/60 border-accent-cool/50'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -100, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -100, x: '-50%' }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`fixed top-6 left-1/2 z-50 backdrop-blur-md border px-4 py-3 rounded-lg text-white font-medium text-sm shadow-xl bg-gradient-to-r ${getColor()}`}
    >
      {notification.message}
    </motion.div>
  )
}
