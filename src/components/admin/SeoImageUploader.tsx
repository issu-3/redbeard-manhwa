'use client';

import { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X, ImageIcon, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface SeoImageUploaderProps {
  /** Hidden input name for the form */
  name: string;
  /** Label shown above the uploader */
  label: string;
  /** Recommended dimensions hint (e.g. "1200 × 630 px") */
  recommendedSize: string;
  /** Currently saved URL from settings */
  currentUrl: string;
  /** Default placeholder path (e.g. '/images/og-default.png') */
  fallbackUrl?: string;
}

export function SeoImageUploader({
  name,
  label,
  recommendedSize,
  currentUrl,
  fallbackUrl = '',
}: SeoImageUploaderProps) {
  const [imageUrl, setImageUrl] = useState(currentUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustom = Boolean(imageUrl && imageUrl !== fallbackUrl);
  const displayUrl = imageUrl || fallbackUrl;
  const isValidImageUrl = Boolean(
    displayUrl && (displayUrl.startsWith('http://') || displayUrl.startsWith('https://') || displayUrl.startsWith('/'))
  );

  function clearMessages() {
    setError(null);
  }

  async function handleFileUpload(file: File) {
    clearMessages();
    setImageLoadError(false);

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const msg = `Invalid file type ".${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
      setError(msg);
      toast.error(msg);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      const msg = `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 5 MB.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const { url } = await res.json();
      setImageUrl(url);
      toast.success(`${label} uploaded! Remember to click "Save Settings" to apply.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  }

  function handlePasteUrl() {
    clearMessages();
    const trimmed = pasteUrl.trim();
    if (!trimmed) {
      setError('Please enter an image URL');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      const msg = 'URL must start with http://, https://, or /';
      setError(msg);
      toast.error(msg);
      return;
    }
    setImageUrl(trimmed);
    setImageLoadError(false);
    setPasteUrl('');
    setShowUrlInput(false);
    toast.success(`${label} URL updated! Remember to click "Save Settings" to apply.`);
  }

  function handleRemove() {
    clearMessages();
    setImageUrl('');
    setImageLoadError(false);
    setShowRemoveConfirm(false);
    toast.success(`${label} removed. Remember to click "Save Settings" to apply.`);
  }

  return (
    <div className="bg-background/50 border border-border/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">{label}</h4>
          <p className="text-xs text-text-muted">Recommended: {recommendedSize}</p>
        </div>
        {isCustom ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
            <Check className="h-3 w-3" />
            Custom
          </span>
        ) : displayUrl ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-400">
            Default
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs font-medium text-zinc-400">
            Not Set
          </span>
        )}
      </div>

      {/* Hidden input that gets submitted with the form */}
      <input type="hidden" name={name} value={imageUrl} />

      {/* Image preview */}
      {isValidImageUrl && !imageLoadError && (
        <div className="space-y-1.5">
          <div className="relative w-full max-w-md rounded-lg overflow-hidden border border-border/50 bg-zinc-950 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={displayUrl}
              src={displayUrl}
              alt={label}
              className="max-h-48 w-full object-contain rounded"
              onError={() => setImageLoadError(true)}
            />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-text-muted max-w-md truncate">
            <span className="truncate">{displayUrl}</span>
            {displayUrl.startsWith('http') && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary shrink-0 ml-1"
                title="Open image in new tab"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {isValidImageUrl && imageLoadError && (
        <div className="flex flex-col items-center justify-center w-full max-w-md h-32 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
          <AlertCircle className="h-6 w-6 text-red-400 mb-1" />
          <p className="text-xs text-red-400 font-medium">Image could not be loaded from URL</p>
          <p className="text-[10px] text-text-muted truncate max-w-xs">{displayUrl}</p>
        </div>
      )}

      {!isValidImageUrl && (
        <div className="flex items-center justify-center w-full max-w-md h-32 rounded-lg border-2 border-dashed border-border/50 bg-background/30">
          <div className="text-center">
            <ImageIcon className="h-8 w-8 text-text-muted mx-auto mb-1" />
            <p className="text-xs text-text-muted">No image configured</p>
          </div>
        </div>
      )}

      {/* Error messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* URL Paste Input */}
      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePasteUrl();
              }
            }}
            placeholder="https://example.com/image.png or /images/..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handlePasteUrl}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Set
          </button>
          <button
            type="button"
            onClick={() => {
              setShowUrlInput(false);
              setPasteUrl('');
              clearMessages();
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Remove confirmation */}
      {showRemoveConfirm && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
          <span className="text-xs text-red-400">Remove this custom image?</span>
          <button
            type="button"
            onClick={handleRemove}
            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setShowRemoveConfirm(false)}
            className="rounded border border-border px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-hover"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = ''; // Reset so same file can be re-selected
          }}
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => {
            clearMessages();
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-hover disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {isUploading ? 'Uploading...' : isCustom ? 'Replace Image' : 'Upload Image'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearMessages();
            setShowUrlInput(!showUrlInput);
            setShowRemoveConfirm(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          Paste URL
        </button>
        {isCustom && !showRemoveConfirm && (
          <button
            type="button"
            onClick={() => {
              clearMessages();
              setShowRemoveConfirm(true);
              setShowUrlInput(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Remove Custom
          </button>
        )}
      </div>

      <p className="text-[10px] text-text-muted">
        Max 5 MB · JPG, PNG, WebP, GIF, AVIF · Publicly accessible URL required for social media crawlers
      </p>
    </div>
  );
}
