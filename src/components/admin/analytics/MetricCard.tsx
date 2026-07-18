export function MetricCard({ title, value, subtitle, trend, trendLabel, icon: Icon }: any) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{title}</h3>
        {Icon && <Icon className="h-5 w-5 text-primary opacity-80" />}
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-black text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            {value}
          </div>
          {subtitle && (
            <div className="text-sm text-text-muted mt-1">{subtitle}</div>
          )}
        </div>
        
        {trend !== undefined && (
          <div className={`flex items-center text-sm font-semibold ${isPositive ? 'text-success' : isNegative ? 'text-error' : 'text-text-muted'}`}>
            {isPositive ? '+' : ''}{trend}%
            {trendLabel && <span className="text-text-muted font-normal ml-1 hidden sm:inline">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
