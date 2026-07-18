'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sword, Compass, Laugh, Drama, Wand2, Skull, Globe, Shield,
  Search, Heart, GraduationCap, Rocket, Coffee, Trophy, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Sword, Compass, Laugh, Drama, Wand2, Skull, Globe, Shield,
  Search, Heart, GraduationCap, Rocket, Coffee, Trophy, AlertTriangle,
};

interface GenreCardProps {
  genre: {
    name: string;
    slug: string;
    icon?: string;
    color?: string;
    seriesCount?: number;
  };
  variant?: 'default' | 'compact';
  index?: number;
}

export function GenreCard({ genre, variant = 'default', index = 0 }: GenreCardProps) {
  const Icon = genre.icon ? iconMap[genre.icon] || Compass : Compass;
  const color = genre.color || '#E53935';

  if (variant === 'compact') {
    return (
      <Link
        href={`/browse/genres/${genre.slug}`}
        className="group flex items-center gap-2 rounded-xl border border-border px-3 py-2 transition-all hover:border-border-hover"
        style={{ '--genre-color': color } as React.CSSProperties}
      >
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
          {genre.name}
        </span>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      whileHover={{ scale: 1.03, y: -2 }}
    >
      <Link
        href={`/browse/genres/${genre.slug}`}
        className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-border-hover hover:shadow-lg"
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at center, ${color}15, transparent 70%)`,
          }}
        />

        <div
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-7 w-7" style={{ color }} />
        </div>

        <div className="relative">
          <h3 className="font-semibold text-text-primary text-sm">{genre.name}</h3>
          {genre.seriesCount !== undefined && (
            <p className="mt-0.5 text-xs text-text-muted">
              {genre.seriesCount} series
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
