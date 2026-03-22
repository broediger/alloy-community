import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react'

interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

interface ToastContextValue {
  toast: (type: ToastMessage['type'], message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const toast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = nextId++
    setMessages((prev) => [...prev, { id, type, message }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {messages.map((msg) => (
          <ToastItem key={msg.id} message={msg} onDismiss={() => dismiss(msg.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const bgClass =
    message.type === 'error'
      ? 'bg-red-50 border-red-200 text-red-800'
      : message.type === 'success'
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-blue-50 border-blue-200 text-blue-800'

  return (
    <div
      className={`px-4 py-3 rounded-lg border shadow-lg text-sm ${bgClass} animate-[slideIn_0.2s_ease-out]`}
    >
      <div className="flex items-start justify-between gap-2">
        <span>{message.message}</span>
        <button onClick={onDismiss} className="shrink-0 hover:opacity-70">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
