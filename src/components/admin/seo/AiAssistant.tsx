'use client';

import { Sparkles, ArrowRight, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

import { useState } from 'react';
import { generateMissingSeoData } from '@/app/actions/admin/seo';
import { useRouter } from 'next/navigation';

export function AiAssistant({ suggestions }: { suggestions: { title: string, desc: string }[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setIsGenerating(true);
    const toastId = toast.loading('Auto-filling SEO data...', {
      description: 'This might take a minute depending on how many items need SEO.'
    });

    try {
      const result = await generateMissingSeoData();
      if (result.success) {
        toast.success('Auto SEO Generation Complete', {
          id: toastId,
          description: result.message
        });
        router.refresh();
      } else {
        throw new Error('Failed to generate SEO');
      }
    } catch (error) {
      toast.error('SEO Generation Failed', {
        id: toastId,
        description: 'An error occurred while generating SEO metadata.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-card to-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Auto SEO Assistant</h2>
            <p className="text-sm text-text-secondary">Smart programmatic optimization</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 flex-grow flex flex-col gap-4">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface/50 border border-border hover:bg-surface transition-colors cursor-pointer group">
            <Lightbulb className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-text-primary text-sm flex items-center gap-2">
                {s.title}
                <ArrowRight className="h-3 w-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              </div>
              <div className="text-xs text-text-secondary mt-1">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 pt-0 mt-auto">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? 'Auto-filling...' : 'Auto-fill SEO Data'}
        </button>
      </div>
    </div>
  );
}
