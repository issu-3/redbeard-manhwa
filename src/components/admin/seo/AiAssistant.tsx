'use client';

import { Sparkles, ArrowRight, Lightbulb, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { useState } from 'react';
import { generateMissingSeoData } from '@/app/actions/admin/seo';
import { useRouter } from 'next/navigation';

interface GenerationSummary {
  titlesGenerated: number;
  descriptionsGenerated: number;
  keywordsGenerated: number;
  canonicalsGenerated: number;
  socialImagesAssigned: number;
  totalUpdated: number;
}

export function AiAssistant({ suggestions }: { suggestions: { title: string, desc: string }[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [lastSummary, setLastSummary] = useState<GenerationSummary | null>(null);
  const router = useRouter();

  const handleGenerate = async (forceRegenerate: boolean = false) => {
    if (forceRegenerate) {
      if (!window.confirm('Are you sure you want to Force Regenerate? This will overwrite all custom SEO titles, descriptions, and keywords across all series and chapters with programmatic values.')) {
        return;
      }
      setIsForcing(true);
    } else {
      setIsGenerating(true);
    }

    const toastId = toast.loading(forceRegenerate ? 'Force regenerating SEO data...' : 'Auto-filling empty SEO data...', {
      description: 'Programmatically generating metadata locally...'
    });

    try {
      const result = await generateMissingSeoData(forceRegenerate);
      if (result.success) {
        setLastSummary(result.summary || null);
        toast.success(forceRegenerate ? 'Force Regeneration Complete' : 'Auto SEO Generation Complete', {
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
      setIsForcing(false);
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
            <h2 className="text-lg font-bold text-text-primary">Local SEO Generator</h2>
            <p className="text-sm text-text-secondary">Instant programmatic optimization</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 flex-grow flex flex-col gap-4">
        {suggestions && suggestions.length > 0 ? (
          suggestions.map((s, i) => (
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
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-text-muted">
            <CheckCircle2 className="h-8 w-8 text-success mb-2" />
            <div className="font-semibold text-text-primary text-sm">All Clear!</div>
            <div className="text-xs">No immediate SEO issues detected.</div>
          </div>
        )}

        {lastSummary && (
          <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-xs space-y-1.5 text-success animate-fade-in">
            <div className="font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Generation Complete ({lastSummary.totalUpdated} items updated)
            </div>
            <div className="grid grid-cols-2 gap-1 text-text-secondary">
              <div className="flex items-center gap-1"><span className="text-success font-bold">✓</span> Title Generated:</div>
              <div className="font-semibold text-text-primary">{lastSummary.titlesGenerated}</div>
              <div className="flex items-center gap-1"><span className="text-success font-bold">✓</span> Description Generated:</div>
              <div className="font-semibold text-text-primary">{lastSummary.descriptionsGenerated}</div>
              <div className="flex items-center gap-1"><span className="text-success font-bold">✓</span> Keywords Generated:</div>
              <div className="font-semibold text-text-primary">{lastSummary.keywordsGenerated}</div>
              <div className="flex items-center gap-1"><span className="text-success font-bold">✓</span> Canonical Generated:</div>
              <div className="font-semibold text-text-primary">{lastSummary.canonicalsGenerated}</div>
              <div className="flex items-center gap-1"><span className="text-success font-bold">✓</span> Social Images Assigned:</div>
              <div className="font-semibold text-text-primary">{lastSummary.socialImagesAssigned}</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 pt-0 mt-auto flex flex-col gap-2.5">
        <button 
          onClick={() => handleGenerate(false)}
          disabled={isGenerating || isForcing}
          className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-primary/20"
        >
          {isGenerating ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? 'Auto-filling...' : 'Auto-fill Empty Fields'}
        </button>

        <button 
          onClick={() => handleGenerate(true)}
          disabled={isGenerating || isForcing}
          className="w-full py-2 bg-surface hover:bg-surface/80 text-text-secondary hover:text-text-primary font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 border border-border transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          title="Force regenerate and overwrite all existing metadata"
        >
          {isForcing ? (
            <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {isForcing ? 'Regenerating All...' : 'Force Regenerate All (Overwrite)'}
        </button>
      </div>
    </div>
  );
}
