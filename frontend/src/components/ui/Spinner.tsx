interface SpinnerProps {
  className?: string
}

export function Spinner({ className = '' }: SpinnerProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}
