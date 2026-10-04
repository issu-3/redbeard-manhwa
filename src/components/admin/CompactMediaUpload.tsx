'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Trash2, Image as ImageIcon, Link as LinkIcon, RefreshCw, AlertCircle } from 'lucide-react';

interface FileInfo {
  width?: number;
  height?: number;
  sizeMB?: string;
}

interface CompactMediaUploadProps {
  name: string;
  label: string;
  recommendedDimensions: string;
  defaultValue?: string;
  isCover?: boolean;
  onChange?: (url: string) => void;
}

export function CompactMediaUpload({ name, label, recommendedDimensions, defaultValue, isCover, onChange }: CompactMediaUploadProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [finalUrl, setFinalUrl] = useState<string>(defaultValue || '');
  const [fileInfo, setFileInfo] = useState<FileInfo>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (onChange) onChange(finalUrl);
  }, [finalUrl, onChange]);

  const processAndUploadFile = async (file: File) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. JPG, PNG, WebP, AVIF only.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Max size is 5MB.');
      return;
    }

    try {
      setIsUploading(true);
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/webp' };
      const { default: imageCompression } = await import('browser-image-compression');
      const compressedFile = await imageCompression(file, options);

      const sizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
      
      // Get dimensions
      const img = document.createElement('img');
      img.src = URL.createObjectURL(compressedFile);
      await new Promise(resolve => { img.onload = resolve; });
      const { width, height } = img;
      setFileInfo({ width, height, sizeMB });

      const formData = new FormData();
      const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
      formData.append('file', compressedFile, newFileName);

      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      setFinalUrl(data.url);
      setMode('url');
    } catch (err: any) {
      setError(err.message || 'Upload error.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAndUploadFile(file);
  };

  return (
    <div className="space-y-2.5">
      <input type="hidden" name={name} value={finalUrl} />
      
      <div className="flex justify-between items-end mb-1">
        <div>
          <label className="text-sm font-bold text-white tracking-wide">{label}</label>
          <p className="text-[11px] text-text-muted mt-0.5">Recommended: {recommendedDimensions} | Max 5MB</p>
        </div>
      </div>

      {error && (
        <div className="bg-[#F20D3A]/10 text-[#F20D3A] p-2.5 rounded-lg text-xs flex items-center gap-1.5 font-medium border border-[#F20D3A]/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {finalUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-[#2A2E39] bg-[#1D212B] p-2 flex items-center gap-3 shadow-sm">
          <div className={`relative bg-[#0B0D12] rounded overflow-hidden shrink-0 border border-[#2A2E39] ${isCover ? 'h-20 w-[54px]' : 'h-12 w-16'}`}>
            <Image src={finalUrl} alt="Preview" fill className="object-cover" sizes="80px" unoptimized />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-xs font-bold text-white truncate">Image Uploaded</p>
            {(fileInfo.width || fileInfo.sizeMB) ? (
              <p className="text-[10px] text-text-muted font-medium mt-0.5">
                {fileInfo.width && fileInfo.height ? `${fileInfo.width}×${fileInfo.height}` : 'Optimized'} • {fileInfo.sizeMB ? `${fileInfo.sizeMB}MB` : '< 1MB'}
              </p>
            ) : (
              <p className="text-[10px] text-text-muted font-medium mt-0.5">Provided via URL</p>
            )}
            <p className="text-[10px] text-green-400 font-bold flex items-center gap-1 mt-1">
              ✓ Success
            </p>
          </div>
          <div className="flex items-center gap-1.5 pr-1">
            <button type="button" onClick={() => { setFinalUrl(''); setMode('upload'); setFileInfo({}); }} className="h-8 w-8 rounded-lg bg-[#2A2E39] flex items-center justify-center hover:bg-[#343A46] text-white transition-colors" title="Replace">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { setFinalUrl(''); setFileInfo({}); }} className="h-8 w-8 rounded-lg bg-[#F20D3A]/10 flex items-center justify-center hover:bg-[#F20D3A]/20 text-[#F20D3A] transition-colors" title="Remove">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#2A2E39] bg-[#1D212B] overflow-hidden transition-colors hover:border-[#343A46]">
          {mode === 'upload' ? (
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2A2E39] hover:bg-[#343A46] border border-[#343A46] rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-text-muted" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-[#F20D3A]" />
                  )}
                  {isUploading ? 'Uploading...' : 'Choose Image'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('url')}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-transparent hover:bg-[#2A2E39] rounded-xl text-sm font-semibold text-text-secondary transition-colors"
                >
                  Paste URL
                </button>
              </div>
              <p className="text-[10px] font-bold text-text-muted mt-3 uppercase tracking-widest">JPG • PNG • WebP • AVIF</p>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="p-3 flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input 
                  type="text" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0B0D12] border border-[#2A2E39] rounded-xl text-sm text-white focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setFinalUrl(urlInput); } }}
                />
              </div>
              <button
                type="button"
                onClick={() => setFinalUrl(urlInput)}
                className="px-4 py-2.5 bg-[#F20D3A] text-white rounded-xl font-bold text-sm hover:bg-[#F20D3A]/90 transition-colors shrink-0"
              >
                Set URL
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className="px-3 py-2.5 hover:bg-[#2A2E39] rounded-xl text-text-secondary font-semibold transition-colors shrink-0"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
