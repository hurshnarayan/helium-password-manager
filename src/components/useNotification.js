import { useState } from 'react'

export const useNotification = () => {
  const [notification, setNotification] = useState(null)

  const notify = (message, type = 'success', duration = 3000) => {
    setNotification({ message, type, id: Date.now() })

    if (duration > 0) {
      setTimeout(() => {
        setNotification(null)
      }, duration)
    }
  }

  return { notification, notify }
}
