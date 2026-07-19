'use client';

import { useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Flame, BookCheck, Star, Eye, TrendingUp } from 'lucide-react';
import { getWebsiteStatistics, WebsiteStats } from '@/app/actions/public/stats';
import { useRef } from 'react';

// Counter component for animated numbers
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;
    
    let startTimestamp: number | null = null;
    const finalValue = value;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      
      // Easing function for smoother animation (easeOutQuart)
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * finalValue));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(finalValue);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [isInView, value, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export function WebsiteStatistics() {
  const [stats, setStats] = useState<WebsiteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getWebsiteStatistics();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadStats();
  }, []);

  const statItems = [
    { 
      icon: Flame, 
      label: 'Active Series', 
      value: stats?.activeSeries || 0, 
      color: '#E53935',
      isRating: false 
    },
    { 
      icon: BookCheck, 
      label: 'Total Chapters', 
      value: stats?.totalChapters || 0, 
      color: '#4CAF50',
      isRating: false 
    },
    { 
      icon: Eye, 
      label: 'Total Views', 
      value: stats?.totalViews || 0, 
      color: '#2196F3',
      isRating: false 
    },
    { 
      icon: Star, 
      label: 'Average Rating', 
      value: stats?.averageRating || null, 
      color: '#FFC107',
      isRating: true 
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center justify-center rounded-2xl bg-card p-6 shadow-card">
            <div className="mb-4 h-12 w-12 rounded-xl bg-surface skeleton" />
            <div className="h-8 w-24 rounded-lg bg-surface skeleton mb-2" />
            <div className="h-4 w-32 rounded-lg bg-surface skeleton" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-card p-6 text-center shadow-card transition-all hover:shadow-card-hover"
        >
          {/* Subtle background glow effect on hover */}
          <div 
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
            style={{ background: `radial-gradient(circle at center, ${stat.color} 0%, transparent 70%)` }}
          />
          
          <div 
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          >
            <stat.icon size={24} color={stat.color} />
          </div>
          
          <div className="mb-1 text-2xl font-bold tracking-tight text-text-primary md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
            {stat.isRating ? (
              stat.value === null ? (
                <span className="text-lg text-text-muted">No ratings yet</span>
              ) : (
                <span>{Number(stat.value).toFixed(1)}<span className="text-lg text-text-muted ml-1">★</span></span>
              )
            ) : (
              <AnimatedCounter value={Number(stat.value)} />
            )}
            {!stat.isRating && stat.value !== null && stat.value > 0 && <span className="text-primary ml-1">+</span>}
          </div>
          
          <div className="text-sm font-medium text-text-muted">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
