'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { UploadCloud, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';

export function ChapterUploader({ onUploadComplete }: { onUploadComplete?: (urls: string[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadedUrls([]);
      setError(null);
      setProgress(0);
    }
  };

  const processArchive = async () => {
    if (!file) return;
    
    setIsExtracting(true);
    setError(null);
    setUploadedUrls([]);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      // Filter valid image files, ignoring macOS artifacts
      const imageFiles: JSZip.JSZipObject[] = [];
      contents.forEach((relativePath, zipEntry) => {
        if (
          !zipEntry.dir &&
          !relativePath.includes('__MACOSX') &&
          !relativePath.includes('.DS_Store') &&
          /\.(jpe?g|png|webp)$/i.test(relativePath)
        ) {
          imageFiles.push(zipEntry);
        }
      });

      if (imageFiles.length === 0) {
        throw new Error('No valid images (JPG, PNG, WEBP) found in the archive.');
      }

      // Natural sort by filename
      imageFiles.sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      setTotalFiles(imageFiles.length);
      setIsExtracting(false);
      setIsUploading(true);

      const urls: string[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const zipEntry = imageFiles[i];
        const blob = await zipEntry.async('blob');
        
        // Extract original filename safely
        const originalName = zipEntry.name.split('/').pop() || `page_${i}.jpg`;
        const imageFile = new File([blob], originalName, { type: blob.type || 'image/jpeg' });

        const formData = new FormData();
        formData.append('file', imageFile);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Failed to upload ${originalName}`);
        }

        const data = await res.json();
        urls.push(data.url);
        setProgress(i + 1);
      }

      setUploadedUrls(urls);
      setIsUploading(false);
      if (onUploadComplete) onUploadComplete(urls);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during extraction/upload.');
      setIsExtracting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-dashed border-border bg-surface p-6 text-center transition-colors hover:bg-surface/80">
        {!isExtracting && !isUploading && uploadedUrls.length === 0 && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <UploadCloud className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Upload Chapter Archive</p>
              <p className="text-xs text-text-secondary mt-1">Accepts .zip or .cbz containing JPG, PNG, WEBP</p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <input 
                type="file" 
                accept=".zip,.cbz,application/zip,application/x-zip-compressed" 
                onChange={handleFileChange}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
              />
              
              {file && (
                <button 
                  type="button" 
                  onClick={processArchive}
                  className="rounded-lg bg-secondary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
                >
                  Extract and Upload Images
                </button>
              )}
            </div>
          </div>
        )}

        {(isExtracting || isUploading) && (
          <div className="space-y-4 py-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <div className="text-sm font-semibold">
              {isExtracting ? 'Reading Archive...' : `Uploading Images: ${progress} / ${totalFiles}`}
            </div>
            {isUploading && (
              <div className="h-2 w-full max-w-md mx-auto overflow-hidden rounded-full bg-border">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress / totalFiles) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {uploadedUrls.length > 0 && (
          <div className="space-y-4 py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-sm font-semibold text-green-500">
              Successfully processed {uploadedUrls.length} images!
            </p>
            
            <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 px-4 max-h-48 overflow-y-auto">
              {uploadedUrls.map((url, i) => (
                <div key={i} className="aspect-[2/3] bg-card rounded overflow-hidden flex items-center justify-center border border-border text-xs relative group">
                  <ImageIcon className="h-4 w-4 text-text-muted" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-mono">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 text-sm font-semibold text-red-500">
            {error}
          </div>
        )}
      </div>

      {/* Hidden input to pass the final URLs to the server action */}
      {!onUploadComplete && (
        <textarea 
          name="imageUrls"
          readOnly
          required
          value={uploadedUrls.join('\n')}
          className="sr-only" // Hide from UI, but keep in DOM for form submission
        />
      )}
    </div>
  );
}
