'use client';

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Activity } from 'lucide-react';

interface TimelineData {
  date: string;
  score: number;
  traffic: number;
}

export function SeoTimeline({ data }: { data: TimelineData[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-6 col-span-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">SEO & Traffic Timeline</h2>
          <p className="text-sm text-text-secondary">Track improvements vs organic traffic (Last 7 Days)</p>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#f3f4f6' }}
              itemStyle={{ color: '#f3f4f6' }}
            />
            <Area yAxisId="left" type="monotone" dataKey="score" name="SEO Score" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
            <Area yAxisId="right" type="monotone" dataKey="traffic" name="Organic Traffic" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTraffic)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
