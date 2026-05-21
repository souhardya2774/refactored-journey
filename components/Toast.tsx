'use client'

import { useEffect } from 'react'

type ToastType = 'success' | 'error'

export default function Toast({
  type = 'success',
  message,
  onClose,
}: {
  type?: ToastType
  message: string
  onClose?: () => void
}) {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const base = 'mr-6 mb-6 max-w-sm w-full shadow-lg rounded-lg px-4 py-3'
  const styles =
    type === 'success'
      ? `${base} bg-emerald-50 text-emerald-900 border border-emerald-100`
      : `${base} bg-rose-50 text-rose-900 border border-rose-100`

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-50">
      <div className={styles} role="status">
        <div className="text-sm">{message}</div>
      </div>
    </div>
  )
}
