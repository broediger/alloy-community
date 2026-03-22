interface CoverageBarProps {
  mapped: number
  total: number
  className?: string
}

export function CoverageBar({ mapped, total, className = '' }: CoverageBarProps) {
  const pct = total > 0 ? Math.round((mapped / total) * 100) : 0
  const colorClass =
    pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : pct > 0 ? 'bg-yellow-500' : 'bg-gray-300'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-10 text-right">{pct}%</span>
    </div>
  )
}
