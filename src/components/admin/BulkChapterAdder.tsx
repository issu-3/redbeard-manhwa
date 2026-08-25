'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createBulkChapters } from '@/app/actions/admin/chapters';
import { Save, RefreshCw, Trash2, Link as LinkIcon } from 'lucide-react';

interface ParsedChapter {
  label: string;
  url: string;
  provider: string;
}

const PROVIDERS = ['TeraBox', 'Google Drive', 'Mega', 'Dropbox', 'MediaFire', 'Custom'];

export function BulkChapterAdder({ seriesId }: { seriesId: string }) {
  const [inputText, setInputText] = useState('');
  const [defaultProvider, setDefaultProvider] = useState('TeraBox');
  const [parsedChapters, setParsedChapters] = useState<ParsedChapter[]>([]);
  const [isPublished, setIsPublished] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleParse = () => {
    if (!inputText.trim()) return;

    const lines = inputText.split('\n');
    const parsed: ParsedChapter[] = [];
    let hasError = false;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!line.trim()) continue;

      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 2) {
        toast.error(`Invalid format on line ${index + 1}: Must be "Label | URL"`);
        hasError = true;
        break;
      }

      const label = parts[0];
      const url = parts.slice(1).join('|').trim();

      if (!label) {
        toast.error(`Empty label on line ${index + 1}`);
        hasError = true;
        break;
      }
      if (!url) {
        toast.error(`Empty URL on line ${index + 1}`);
        hasError = true;
        break;
      }

      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          throw new Error('Must be http/https');
        }
      } catch (e) {
        toast.error(`Invalid URL on line ${index + 1}: ${url}`);
        hasError = true;
        break;
      }

      parsed.push({
        label,
        url,
        provider: defaultProvider
      });
    }

    if (hasError) return;

    if (parsed.length === 0) {
      toast.error('Could not parse any chapters. Use format: Label | URL');
      return;
    }

    setParsedChapters(parsed);
    toast.success(`Parsed ${parsed.length} chapters.`);
  };

  const handleRemove = (index: number) => {
    setParsedChapters(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (parsedChapters.length === 0) return;

    startTransition(async () => {
      try {
        const res = await createBulkChapters(seriesId, parsedChapters, isPublished);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(`Successfully added ${res.count} chapters!`);
          router.push(`/admin/series/${seriesId}/chapters`);
        }
      } catch (err: any) {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border p-6 rounded-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold mb-2">Bulk Add Download Links</h2>
          <p className="text-sm text-text-muted mb-4">
            Paste your chapters below. One chapter per line. Use the pipe `|` character to separate the label and the URL.<br/>
            Example: <code>Chapter 1 | https://terabox.com/s/12345</code>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <textarea
              className="w-full h-48 rounded-xl border border-border bg-card p-4 text-sm font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
              placeholder="Chapter 1 | https://terabox.com/s/...\nChapter 2 | https://terabox.com/s/..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Default Provider</label>
              <select
                value={defaultProvider}
                onChange={(e) => setDefaultProvider(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-4 py-2 font-medium"
              >
                {PROVIDERS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleParse}
              className="w-full rounded-lg bg-primary/10 text-primary px-4 py-3 font-semibold hover:bg-primary/20 transition-colors"
            >
              Parse Links
            </button>
          </div>
        </div>
      </div>

      {parsedChapters.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface">
            <h3 className="font-bold">Preview ({parsedChapters.length} Chapters)</h3>
            <button
              onClick={() => setParsedChapters([])}
              className="text-sm text-red-500 hover:underline"
            >
              Clear All
            </button>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/50 text-text-secondary sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 font-semibold">Label</th>
                  <th className="px-6 py-3 font-semibold">URL</th>
                  <th className="px-6 py-3 font-semibold">Provider</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedChapters.map((ch, idx) => (
                  <tr key={idx} className="hover:bg-surface/50">
                    <td className="px-6 py-3 font-medium">{ch.label}</td>
                    <td className="px-6 py-3 text-text-muted truncate max-w-[200px] sm:max-w-xs">
                      <a href={ch.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
                        <LinkIcon className="h-3 w-3" /> {ch.url}
                      </a>
                    </td>
                    <td className="px-6 py-3">{ch.provider}</td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => handleRemove(idx)} className="text-text-muted hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border bg-surface flex justify-between items-center">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-card text-primary"
              />
              <label htmlFor="isPublished" className="text-sm font-semibold">Publish immediately</label>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPending ? 'Saving...' : `Save ${parsedChapters.length} Chapters`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
