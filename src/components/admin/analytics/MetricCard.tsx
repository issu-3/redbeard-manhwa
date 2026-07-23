import { ArrowUpRight, ArrowDownRight, Minus, Clock } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

export function MetricCard({ title, value, subtitle, trend, sparkline, icon: Icon, lastUpdated }: any) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const isNeutral = trend === 0;
  
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col h-full relative overflow-hidden group">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</h3>
        {Icon && <Icon className="h-4 w-4 text-text-muted opacity-80" />}
      </div>
      
      <div className="flex-1">
        <div className="flex items-end gap-3 mb-1">
          <div className="text-3xl font-black text-text-primary tracking-tight">
            {value}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center text-xs font-bold mb-1 px-1.5 py-0.5 rounded ${
              isPositive ? 'bg-success/10 text-success' : 
              isNegative ? 'bg-error/10 text-error' : 
              'bg-surface-hover text-text-muted'
            }`}>
              {isPositive && <ArrowUpRight className="h-3 w-3 mr-0.5" />}
              {isNegative && <ArrowDownRight className="h-3 w-3 mr-0.5" />}
              {isNeutral && <Minus className="h-3 w-3 mr-0.5" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-text-muted">{subtitle}</div>
        )}
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="h-12 w-full mt-4 -mx-2 -mb-2 opacity-60 group-hover:opacity-100 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline} id={title}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#8b5cf6'} 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {lastUpdated && (
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center text-[10px] text-text-muted uppercase tracking-wider font-semibold">
          <Clock className="h-3 w-3 mr-1" />
          Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}
