'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ComposedChart,
  Legend
} from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16'];

const EmptyState = ({ message }: { message: string }) => (
  <div className="h-[300px] flex items-center justify-center text-text-muted text-sm border border-dashed border-border rounded-lg">
    {message}
  </div>
);

const dateFormatter = (str: string) => {
  const d = new Date(str);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export function DailyTrafficChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptyState message="No traffic data for this period" />;
  
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis 
            dataKey="date" 
            tickFormatter={dateFormatter}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            dy={10}
            minTickGap={20}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--primary)' }}
            labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
          />
          <Area type="monotone" name="Views" dataKey="views" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UserGrowthChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptyState message="No user growth data" />;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis 
            dataKey="date" 
            tickFormatter={dateFormatter}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            dy={10}
            minTickGap={20}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            allowDecimals={false}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
            labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar yAxisId="left" name="New Users" dataKey="newUsers" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
          <Line yAxisId="right" name="Cumulative Users" type="monotone" dataKey="cumulativeUsers" stroke="#8b5cf6" strokeWidth={3} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PublishingActivityChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptyState message="No publishing data" />;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis 
            dataKey="date" 
            tickFormatter={dateFormatter}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            dy={10}
            minTickGap={20}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
            cursor={{ fill: 'var(--surface-hover)' }}
            labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar name="New Series" dataKey="series" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Bar name="New Chapters" dataKey="chapters" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReadingDistributionChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptyState message="No reading data available" />;

  return (
    <div className="h-[300px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
            formatter={(value: any) => [`${value} Views`, undefined]}
          />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
            wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}



export function HorizontalBarChart({ data, xKey, yKey, nameKey, color = '#ef4444' }: { data: any[], xKey: string, yKey: string, nameKey: string, color?: string }) {
  if (!data || data.length === 0) return <EmptyState message="No data available" />;
  
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <YAxis type="category" dataKey={nameKey} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} width={120} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
            cursor={{ fill: 'var(--surface-hover)' }}
          />
          <Bar dataKey={yKey} fill={color} radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RetentionChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptyState message="No retention data" />;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="cohort" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line name="Week 1" type="monotone" dataKey="week1" stroke="#3b82f6" strokeWidth={2} />
          <Line name="Week 2" type="monotone" dataKey="week2" stroke="#8b5cf6" strokeWidth={2} />
          <Line name="Week 3" type="monotone" dataKey="week3" stroke="#f43f5e" strokeWidth={2} />
          <Line name="Week 4" type="monotone" dataKey="week4" stroke="#eab308" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeviceDistributionChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptyState message="No device data available" />;
  return (
    <div className="h-[300px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
            formatter={(value: any) => [`${value} Sessions`, undefined]}
          />
          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
