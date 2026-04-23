interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  icon?: string
}

export function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className={`relative rounded-2xl border p-4 sm:p-5 overflow-hidden transition-all duration-200 ${
      accent
        ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5'
        : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.1]'
    }`}>
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-8 translate-x-8 blur-2xl pointer-events-none" />
      )}
      <p className="text-[10px] sm:text-xs text-white/30 uppercase tracking-widest font-semibold mb-2 sm:mb-3 flex items-center gap-1.5">
        {icon && <span>{icon}</span>}
        {label}
      </p>
      <p className={`text-2xl sm:text-3xl font-black tracking-tight ${
        accent
          ? 'bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent'
          : 'text-white'
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-white/25 mt-1.5 font-medium">{sub}</p>}
    </div>
  )
}
