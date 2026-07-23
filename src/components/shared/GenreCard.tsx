'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sword, Compass, Laugh, Drama, Wand2, Skull, Globe,
  Search, Heart, GraduationCap, Rocket, Coffee, Trophy, AlertTriangle,
  Hash, Flame, Castle, Ghost, Sparkles, Crown, Brain,
  Activity, BookOpen, Star, Eye, ChefHat, Palette, Users,
  Scroll, Briefcase, RotateCw, Clock, Droplet, MonitorSmartphone
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const genreStyleMap: Record<string, { icon: LucideIcon, color: string, gradient: string }> = {
  'Action': { icon: Flame, color: '#FF4500', gradient: 'from-[#FF4500] to-[#FF8C00]' },
  'Adaptation': { icon: BookOpen, color: '#4169E1', gradient: 'from-[#4169E1] to-[#1E90FF]' },
  'Adventure': { icon: Compass, color: '#2E8B57', gradient: 'from-[#2E8B57] to-[#3CB371]' },
  'Comedy': { icon: Laugh, color: '#FFD700', gradient: 'from-[#FFD700] to-[#FFA500]' },
  'Cooking': { icon: ChefHat, color: '#F4A460', gradient: 'from-[#F4A460] to-[#DEB887]' },
  'Demons': { icon: Skull, color: '#800000', gradient: 'from-[#800000] to-[#A52A2A]' },
  'Doujinshi': { icon: Palette, color: '#FF69B4', gradient: 'from-[#FF69B4] to-[#FFB6C1]' },
  'Drama': { icon: Drama, color: '#8A2BE2', gradient: 'from-[#8A2BE2] to-[#9370DB]' },
  'Ecchi': { icon: Heart, color: '#FF69B4', gradient: 'from-[#FF69B4] to-[#FFB6C1]' },
  'Fantasy': { icon: Wand2, color: '#9400D3', gradient: 'from-[#9400D3] to-[#BA55D3]' },
  'Full Color': { icon: Palette, color: '#FF00FF', gradient: 'from-[#FF00FF] to-[#FF69B4]' },
  'Gender Bender': { icon: Users, color: '#9370DB', gradient: 'from-[#9370DB] to-[#DDA0DD]' },
  'Harem': { icon: Heart, color: '#FF1493', gradient: 'from-[#FF1493] to-[#FF69B4]' },
  'Historical': { icon: Castle, color: '#B8860B', gradient: 'from-[#B8860B] to-[#DAA520]' },
  'Horror': { icon: Skull, color: '#8B0000', gradient: 'from-[#8B0000] to-[#B22222]' },
  'Isekai': { icon: Globe, color: '#00CED1', gradient: 'from-[#00CED1] to-[#40E0D0]' },
  'Josei': { icon: BookOpen, color: '#9932CC', gradient: 'from-[#9932CC] to-[#BA55D3]' },
  'Long Strip': { icon: Scroll, color: '#20B2AA', gradient: 'from-[#20B2AA] to-[#48D1CC]' },
  'Magic': { icon: Sparkles, color: '#9370DB', gradient: 'from-[#9370DB] to-[#DDA0DD]' },
  'Manga': { icon: BookOpen, color: '#4682B4', gradient: 'from-[#4682B4] to-[#5F9EA0]' },
  'Martial Arts': { icon: Activity, color: '#FF0000', gradient: 'from-[#FF0000] to-[#FF4500]' },
  'Monster': { icon: Ghost, color: '#556B2F', gradient: 'from-[#556B2F] to-[#6B8E23]' },
  'Mystery': { icon: Search, color: '#4B0082', gradient: 'from-[#4B0082] to-[#6A5ACD]' },
  'Office Workers': { icon: Briefcase, color: '#708090', gradient: 'from-[#708090] to-[#778899]' },
  'Psychological': { icon: Brain, color: '#4682B4', gradient: 'from-[#4682B4] to-[#5F9EA0]' },
  'Reincarnation': { icon: RotateCw, color: '#32CD32', gradient: 'from-[#32CD32] to-[#98FB98]' },
  'Romance': { icon: Heart, color: '#FF1493', gradient: 'from-[#FF1493] to-[#FF69B4]' },
  'School Life': { icon: GraduationCap, color: '#1E90FF', gradient: 'from-[#1E90FF] to-[#87CEEB]' },
  'Sci Fi': { icon: Rocket, color: '#4169E1', gradient: 'from-[#4169E1] to-[#1E90FF]' },
  'Seinen': { icon: Eye, color: '#2F4F4F', gradient: 'from-[#2F4F4F] to-[#708090]' },
  'Shoujo': { icon: Star, color: '#FF1493', gradient: 'from-[#FF1493] to-[#FF69B4]' },
  'Shoujo Ai': { icon: Heart, color: '#FF69B4', gradient: 'from-[#FF69B4] to-[#FFB6C1]' },
  'Shounen': { icon: Sword, color: '#FF4500', gradient: 'from-[#FF4500] to-[#FF6347]' },
  'Shounen Ai': { icon: Heart, color: '#FF4500', gradient: 'from-[#FF4500] to-[#FF6347]' },
  'Slice Of Life': { icon: Coffee, color: '#D2691E', gradient: 'from-[#D2691E] to-[#CD853F]' },
  'Sports': { icon: Trophy, color: '#FF8C00', gradient: 'from-[#FF8C00] to-[#FFA500]' },
  'Supernatural': { icon: Ghost, color: '#483D8B', gradient: 'from-[#483D8B] to-[#7B68EE]' },
  'Thriller': { icon: AlertTriangle, color: '#DC143C', gradient: 'from-[#DC143C] to-[#FF6347]' },
  'Time Travel': { icon: Clock, color: '#00BFFF', gradient: 'from-[#00BFFF] to-[#87CEFA]' },
  'Tragedy': { icon: Droplet, color: '#483D8B', gradient: 'from-[#483D8B] to-[#7B68EE]' },
  'Villainess': { icon: Crown, color: '#800080', gradient: 'from-[#800080] to-[#DA70D6]' },
  'Web Comic': { icon: MonitorSmartphone, color: '#20B2AA', gradient: 'from-[#20B2AA] to-[#48D1CC]' },
  'Webtoons': { icon: MonitorSmartphone, color: '#00FA9A', gradient: 'from-[#00FA9A] to-[#3CB371]' },
  'Yaoi': { icon: Heart, color: '#FF4500', gradient: 'from-[#FF4500] to-[#FF6347]' },
  'Yuri': { icon: Heart, color: '#FF69B4', gradient: 'from-[#FF69B4] to-[#FFB6C1]' },
  'Zombies': { icon: Skull, color: '#556B2F', gradient: 'from-[#556B2F] to-[#6B8E23]' },
  'Adult': { icon: Flame, color: '#C71585', gradient: 'from-[#C71585] to-[#DB7093]' },
  'Default': { icon: Hash, color: '#E53935', gradient: 'from-[#E53935] to-[#EF5350]' }
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
  const toTitleCase = (str: string) => str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const normalizedName = toTitleCase(genre.name);
  
  const style = genreStyleMap[genre.name] || genreStyleMap[normalizedName] || genreStyleMap['Default'];
  const Icon = style.icon;
  const color = genre.color && genre.color !== '#E53935' ? genre.color : style.color;
  
  // Custom gradient if a specific hex color is used from DB instead of our map
  const isCustomColor = genre.color && genre.color !== '#E53935' && !genreStyleMap[genre.name] && !genreStyleMap[normalizedName];
  const customGradientStyle = isCustomColor ? { background: `linear-gradient(135deg, ${color}, ${color}80)` } : {};

  if (variant === 'compact') {
    return (
      <Link
        href={`/browse/genres/${genre.slug}`}
        className="group flex items-center gap-2 rounded-xl border border-border px-3 py-2 transition-all hover:border-border-hover bg-surface/50 hover:bg-surface"
      >
        <div className={`flex items-center justify-center rounded-full p-1.5 ${!isCustomColor ? `bg-gradient-to-br ${style.gradient}` : ''}`} style={customGradientStyle}>
          <Icon className="h-3 w-3 text-white" />
        </div>
        <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
          {genre.name}
        </span>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ scale: 1.05, y: -4 }}
      className="h-full"
    >
      <Link
        href={`/browse/genres/${genre.slug}`}
        className="group relative flex h-full flex-col items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:border-border-hover"
        style={{
          boxShadow: `0 4px 20px -10px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Ambient Glow Background on Hover */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at center, ${color}25, transparent 70%)`,
          }}
        />

        {/* Circular Gradient Badge */}
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_25px_${color}80] ${!isCustomColor ? `bg-gradient-to-br ${style.gradient}` : ''}`}
          style={{ 
            ...customGradientStyle,
            boxShadow: `0 8px 16px -4px ${color}60`
          }}
        >
          <Icon className="h-7 w-7 text-white drop-shadow-md" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <h3 className="font-bold text-text-primary text-base tracking-tight transition-colors duration-300 group-hover:text-white">{genre.name}</h3>
          {genre.seriesCount !== undefined && (
            <div className="mt-1 flex items-center justify-center gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              <p className="text-xs font-medium text-text-muted">
                {genre.seriesCount} series
              </p>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
