'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-20 px-6',
        className,
      )}
    >
      {/* Icon */}
      {icon && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 text-text-muted/40"
        >
          <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center">
            {icon}
          </div>
        </motion.div>
      )}

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-lg font-semibold text-text-primary mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="text-sm text-text-secondary max-w-sm leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Action button */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6"
        >
          <Link
            href={action.href}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg',
              'bg-primary text-white text-sm font-medium',
              'hover:bg-primary-hover transition-colors duration-200',
              'focus-ring',
            )}
          >
            {action.label}
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
