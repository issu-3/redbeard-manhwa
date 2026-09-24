'use client';

import { useEffect, useState } from 'react';
import { AndroidSeriesView } from '@/components/native/AndroidSeriesView';
import { SeriesRepository } from '@/lib/sqlite/repository';
import { Loader2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export function AndroidSeriesClientWrapper({ slug }: { slug: string }) {
  const [series, setSeries] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const res = await fetch(`/api/public/series/${slug}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      
      setSeries(data.series);
      setChapters(data.chapters || []);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !series) {
    return notFound();
  }

  return (
    <AndroidSeriesView 
      series={series} 
      chapters={chapters} 
      onRefresh={() => loadData(true)} 
      isRefreshing={refreshing} 
    />
  );
}
