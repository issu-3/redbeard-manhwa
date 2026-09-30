'use client';

import { useState, useEffect } from 'react';
import { Loader2, FolderSearch, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { getExistingChapters, createChapter } from '@/app/actions/admin/chapters';

interface GoogleDriveImportProps {
  seriesId: string;
}

interface DriveChapter {
  id: string;
  name: string;
  number: number | null;
  images: { id: string; name: string; mimeType: string }[];
  selected?: boolean;
  status?: 'pending' | 'importing' | 'success' | 'error' | 'duplicate';
  skip?: boolean;
}

export function GoogleDriveImport({ seriesId }: GoogleDriveImportProps) {
  const [folderUrl, setFolderUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DriveChapter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingNumbers, setExistingNumbers] = useState<Set<number>>(new Set());

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ chapterIndex: 0, currentImage: 0, totalImages: 0 });

  useEffect(() => {
    // Fetch existing chapters to check for duplicates
    getExistingChapters(seriesId).then((chapters) => {
      const nums = new Set<number>();
      chapters.forEach((c) => { if (c.number !== null) nums.add(c.number); });
      setExistingNumbers(nums);
    });
  }, [seriesId]);

  const handleScan = async () => {
    if (!folderUrl) return;
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const res = await fetch('/api/admin/drive/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan folder');
      }

      const chapters = data.chapters.map((c: DriveChapter) => {
        const isDuplicate = c.number !== null && existingNumbers.has(c.number);
        return {
          ...c,
          selected: !isDuplicate, // Default don't select duplicates
          status: isDuplicate ? 'duplicate' : 'pending',
          skip: isDuplicate,
        };
      });

      setScanResult(chapters);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (!scanResult) return;
    setScanResult(scanResult.map(c => c.id === id ? { ...c, selected: !c.selected, skip: false } : c));
  };

  const setSkipDuplicate = (id: string, skip: boolean) => {
    if (!scanResult) return;
    setScanResult(scanResult.map(c => c.id === id ? { ...c, skip, selected: true } : c));
  };

  const selectAll = (select: boolean) => {
    if (!scanResult) return;
    setScanResult(scanResult.map(c => ({ ...c, selected: select })));
  };

  const handleImport = async () => {
    if (!scanResult) return;
    const chaptersToImport = scanResult.filter(c => c.selected && !c.skip);
    if (chaptersToImport.length === 0) return;

    setIsImporting(true);
    setError(null);

    let chaptersDone = 0;
    let imagesDone = 0;
    const totalSelectedImages = chaptersToImport.reduce((acc, c) => acc + c.images.length, 0);

    const updatedResult = [...scanResult];

    for (let i = 0; i < chaptersToImport.length; i++) {
      const chapter = chaptersToImport[i];
      const resultIdx = updatedResult.findIndex(c => c.id === chapter.id);
      
      updatedResult[resultIdx].status = 'importing';
      setScanResult([...updatedResult]);

      const uploadedUrls: string[] = [];
      let chapterFailed = false;

      for (let j = 0; j < chapter.images.length; j++) {
        const img = chapter.images[j];
        setImportProgress({ chapterIndex: i, currentImage: j + 1, totalImages: totalSelectedImages });

        try {
          const res = await fetch('/api/admin/drive/import-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: img.id, fileName: img.name }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          uploadedUrls.push(data.url);
          imagesDone++;
        } catch (err) {
          console.error(`Failed to import image ${img.name}:`, err);
          // Continue with next image, don't break chapter import completely
        }
      }

      // Now create the chapter
      try {
        const formData = new FormData();
        formData.append('number', chapter.number !== null ? chapter.number.toString() : '');
        formData.append('label', chapter.name);
        formData.append('title', '');
        formData.append('isPublished', 'true');
        formData.append('sourceType', 'UPLOAD');
        formData.append('imageUrls', uploadedUrls.join('\n'));

        // Actually create via our internal route to avoid server action CORS/client issues
        await createChapter(seriesId, formData);
        
        updatedResult[resultIdx].status = 'success';
        chaptersDone++;
      } catch (err) {
        console.error(`Failed to save chapter ${chapter.name}:`, err);
        updatedResult[resultIdx].status = 'error';
        chapterFailed = true;
      }

      setScanResult([...updatedResult]);
    }

    setIsImporting(false);
    
    // Redirect to chapters list after a short delay
    setTimeout(() => {
      window.location.href = `/admin/series/${seriesId}/chapters`;
    }, 2000);
  };

  if (isImporting) {
    const chaptersToImport = scanResult?.filter(c => c.selected && !c.skip) || [];
    const currentChapter = chaptersToImport[importProgress.chapterIndex];
    const totalImages = chaptersToImport.reduce((acc, c) => acc + c.images.length, 0);
    const completedImages = chaptersToImport.slice(0, importProgress.chapterIndex).reduce((acc, c) => acc + c.images.length, 0) + importProgress.currentImage;
    const pct = Math.round((completedImages / Math.max(1, totalImages)) * 100);

    return (
      <div className="space-y-6 bg-surface p-6 rounded-xl border border-border text-center py-12">
        <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
        <div>
          <h3 className="text-xl font-bold">Importing chapters...</h3>
          <p className="text-text-secondary mt-2">Please do not close this window.</p>
        </div>
        
        <div className="max-w-md mx-auto text-left space-y-4">
          <div className="bg-card p-4 rounded-lg border border-border">
             <div className="flex justify-between font-semibold text-sm mb-2">
                <span>{currentChapter?.name}</span>
                <span>{importProgress.currentImage}/{currentChapter?.images.length} images</span>
             </div>
             <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(importProgress.currentImage / Math.max(1, currentChapter?.images.length || 1)) * 100}%` }} />
             </div>
          </div>
          
          <div className="text-sm font-semibold flex justify-between">
            <span>Overall Progress</span>
            <span>{pct}%</span>
          </div>
          <div className="h-3 w-full bg-card rounded-full overflow-hidden border border-border">
             <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-text-muted text-center">{completedImages} / {totalImages} total images</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!scanResult ? (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-bold mb-2">Google Drive Folder</h3>
          <p className="text-sm text-text-secondary mb-4">Paste a Google Drive folder URL containing chapter folders.</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="url"
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..." 
              className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
            />
            <button 
              type="button"
              onClick={handleScan}
              disabled={isScanning || !folderUrl}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderSearch className="h-4 w-4" />}
              {isScanning ? 'Scanning...' : 'Scan Folder'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold flex gap-2 items-start">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold">Google Drive Import</h3>
              <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-text-secondary">
                <span className="flex items-center gap-1 text-green-500"><CheckCircle2 className="h-4 w-4" /> {scanResult.length} chapters detected</span>
                <span className="flex items-center gap-1 text-sky-500"><CheckCircle2 className="h-4 w-4" /> {scanResult.reduce((acc, c) => acc + c.images.length, 0).toLocaleString()} images detected</span>
              </div>
            </div>
            <button type="button" onClick={() => setScanResult(null)} className="text-sm text-text-muted hover:text-text-primary underline">
              Scan another folder
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col max-h-[400px]">
             <div className="p-3 bg-surface border-b border-border flex justify-between items-center text-sm font-semibold">
                <div className="flex gap-4">
                  <button type="button" onClick={() => selectAll(true)} className="text-primary hover:underline">Select All</button>
                  <button type="button" onClick={() => selectAll(false)} className="text-text-secondary hover:underline">Deselect All</button>
                </div>
                <span className="text-text-muted">{scanResult.filter(c => c.selected && !c.skip).length} selected</span>
             </div>
             
             <div className="overflow-y-auto p-2 space-y-1 flex-1">
               {scanResult.map(chapter => (
                 <div key={chapter.id} className={`flex items-center justify-between p-3 rounded-lg border ${chapter.selected && !chapter.skip ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-surface'} transition-colors`}>
                   <div className="flex items-center gap-3">
                     <input 
                       type="checkbox" 
                       checked={chapter.selected}
                       onChange={() => toggleSelect(chapter.id)}
                       className="h-4 w-4 rounded border-border bg-card text-primary"
                     />
                     <div>
                       <div className="text-sm font-semibold flex items-center gap-2">
                         {chapter.name}
                         {chapter.number === null && (
                           <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded flex items-center gap-1">
                             <AlertTriangle className="h-3 w-3" /> Unable to detect chapter number
                           </span>
                         )}
                       </div>
                       <div className="text-xs text-text-muted mt-0.5">{chapter.images.length} images</div>
                     </div>
                   </div>
                   
                   {chapter.status === 'duplicate' && chapter.selected && (
                     <div className="flex items-center gap-2 text-xs">
                        <span className="text-amber-500 font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Exists</span>
                        <select 
                          value={chapter.skip ? 'skip' : 'replace'} 
                          onChange={(e) => setSkipDuplicate(chapter.id, e.target.value === 'skip')}
                          className="bg-card border border-border rounded px-2 py-1 outline-none focus:border-primary"
                        >
                          <option value="skip">Skip</option>
                          <option value="replace">Replace/Update</option>
                        </select>
                     </div>
                   )}
                   
                   {chapter.status === 'success' && (
                     <span className="text-green-500 text-sm font-semibold flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Imported</span>
                   )}
                 </div>
               ))}
             </div>
          </div>

          <div className="mt-6 flex justify-end gap-4">
             <button 
               type="button"
               onClick={handleImport}
               disabled={scanResult.filter(c => c.selected && !c.skip).length === 0}
               className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
             >
               Import Selected Chapters
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
