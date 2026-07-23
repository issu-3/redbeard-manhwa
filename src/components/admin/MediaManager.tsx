'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { UploadCloud, Link as LinkIcon, X, Check, Copy, ExternalLink, Download, RefreshCw, AlertCircle } from 'lucide-react';

type Mode = 'upload' | 'url';

interface MediaManagerProps {
  name: string;
  label: string;
  recommendedDimensions?: string;
  defaultValue?: string;
}

export function MediaManager({ name, label, recommendedDimensions, defaultValue }: MediaManagerProps) {
  const [mode, setMode] = useState<Mode>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [finalUrl, setFinalUrl] = useState<string>(defaultValue || '');
  
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultValue) {
      setMode('url');
      setUrlInput(defaultValue);
      setFinalUrl(defaultValue);
    }
  }, [defaultValue]);

  const handleUrlSave = () => {
    if (!urlInput) {
      setError('Please enter a valid URL.');
      return;
    }
    // Basic URL validation
    try {
      new URL(urlInput);
      setFinalUrl(urlInput);
      setError(null);
    } catch {
      setError('Invalid URL format.');
    }
  };

  const processAndUploadFile = async (file: File) => {
    setError(null);

    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, WebP, and AVIF are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    try {
      setIsUploading(true);
      setProgress(20);

      // Compress and convert to WebP
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      
      const { default: imageCompression } = await import('browser-image-compression');
      const compressedFile = await imageCompression(file, options);
      setProgress(50);

      // Upload to API
      const formData = new FormData();
      // Ensure we provide a filename, especially if compressedFile is a Blob
      const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
      formData.append('file', compressedFile, newFileName);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setProgress(100);
      setFinalUrl(data.url);
      setMode('url');
      setUrlInput(data.url);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAndUploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processAndUploadFile(file);
  };

  const handleRemove = () => {
    setFinalUrl('');
    setUrlInput('');
    setError(null);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(finalUrl);
  };

  return (
    <div className="space-y-4">
      {/* Hidden input to securely pass the final URL to Server Actions */}
      <input type="hidden" name={name} value={finalUrl} />

      <div className="flex justify-between items-end">
        <div>
          <label className="text-sm font-semibold">{label}</label>
          {recommendedDimensions && (
            <p className="text-xs text-text-muted mt-1">Recommended: {recommendedDimensions} | Max 5MB</p>
          )}
        </div>

        {/* Mode Switcher */}
        {!finalUrl && (
          <div className="flex bg-surface rounded-lg p-1 border border-border">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${mode === 'upload' ? 'bg-background shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${mode === 'url' ? 'bg-background shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
            >
              URL
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {finalUrl ? (
        <div className="relative group rounded-xl border border-border overflow-hidden bg-surface aspect-video">
          <Image 
            src={finalUrl} 
            alt="Preview"
            fill
            className="object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
          
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
            <div className="flex justify-end gap-2">
              <button type="button" onClick={copyToClipboard} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md transition" title="Copy URL">
                <Copy className="w-4 h-4" />
              </button>
              <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md transition" title="Open Original">
                <ExternalLink className="w-4 h-4" />
              </a>
              <a href={finalUrl} download className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md transition" title="Download">
                <Download className="w-4 h-4" />
              </a>
            </div>
            
            <div className="flex justify-center gap-4">
              <button type="button" onClick={() => { setFinalUrl(''); setMode('upload'); }} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-md font-semibold text-sm transition">
                <RefreshCw className="w-4 h-4" /> Replace
              </button>
              <button type="button" onClick={handleRemove} className="flex items-center gap-2 bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg backdrop-blur-md font-semibold text-sm transition">
                <X className="w-4 h-4" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : mode === 'upload' ? (
        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-text-muted bg-surface'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="text-sm font-semibold text-text-primary">Uploading & Compressing...</div>
              <div className="w-full max-w-xs bg-background rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-background rounded-full">
                <UploadCloud className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">Drag & drop your image here</p>
                <p className="text-xs text-text-muted mb-4">Supports JPG, PNG, WebP, AVIF</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-semibold transition"
                >
                  Browse Files
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp,image/avif" 
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUrlSave(); } }}
            />
          </div>
          <button
            type="button"
            onClick={handleUrlSave}
            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Load
          </button>
        </div>
      )}
    </div>
  );
}
