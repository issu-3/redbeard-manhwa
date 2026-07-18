'use client';

import { useState, useTransition } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Upload, Save, RefreshCw, Link as LinkIcon, Database } from 'lucide-react';
import { toast } from 'sonner';
import { ChapterUploader } from './ChapterUploader';
import { updateChapter, createChapter } from '@/app/actions/admin/chapters';

function SortableImage({ id, url, pageNumber, onRemove, onReplace }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      const toastId = toast.loading('Uploading replacement image...');
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Failed to upload');
        const data = await res.json();
        onReplace(id, data.url);
        toast.success('Image replaced!', { id: toastId });
      } catch (err: any) {
        toast.error(err.message, { id: toastId });
      }
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative group rounded-lg overflow-hidden border-2 ${isDragging ? 'border-primary shadow-xl opacity-80' : 'border-border'} bg-card aspect-[2/3]`}>
      <img src={url} alt={`Page ${pageNumber}`} className="w-full h-full object-cover pointer-events-none" />
      
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-mono px-2 py-1 rounded">
        {pageNumber}
      </div>

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <button type="button" {...attributes} {...listeners} className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5" />
        </button>
        
        <label className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white cursor-pointer">
          <Upload className="h-5 w-5" />
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
        
        <button type="button" onClick={() => onRemove(id)} className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

const EXTERNAL_PROVIDERS = [
  'TeraBox',
  'Google Drive',
  'Mega',
  'Dropbox',
  'MediaFire',
  'Custom'
];

export function ChapterEditor({ seriesId, chapter, initialImages = [] }: { seriesId: string; chapter?: any; initialImages?: any[] }) {
  const [sourceType, setSourceType] = useState(chapter?.sourceType || 'UPLOAD');
  const [images, setImages] = useState(initialImages.map((img: any, i: number) => ({ id: `img-${Date.now()}-${i}`, url: img.imageUrl })));
  const [isPending, startTransition] = useTransition();
  const [showUploader, setShowUploader] = useState(images.length === 0 && sourceType === 'UPLOAD');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleReplaceImage = (id: string, newUrl: string) => {
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, url: newUrl } : img));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    formData.append('sourceType', sourceType);
    
    if (sourceType === 'UPLOAD') {
      formData.append('imageUrls', images.map(img => img.url).join('\n'));
      if (images.length === 0) {
        toast.error('A chapter must contain at least one image.');
        return;
      }
    } else {
      const url = formData.get('externalUrl');
      if (!url) {
        toast.error('External URL is required.');
        return;
      }
    }

    startTransition(async () => {
      try {
        let res;
        if (chapter) {
          res = await updateChapter(chapter.id, seriesId, formData);
        } else {
          res = await createChapter(seriesId, formData);
        }
        
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(chapter ? 'Chapter updated successfully!' : 'Chapter created successfully!');
        }
      } catch (err: any) {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* Source Type Toggle */}
      <div className="bg-surface p-1 rounded-xl border border-border inline-flex w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setSourceType('UPLOAD')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            sourceType === 'UPLOAD' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary hover:bg-card'
          }`}
        >
          <Database className="h-4 w-4" />
          Upload Archive
        </button>
        <button
          type="button"
          onClick={() => setSourceType('EXTERNAL')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            sourceType === 'EXTERNAL' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary hover:bg-card'
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          External Link
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Chapter Number *</label>
          <input 
            name="number" 
            type="number"
            step="0.1"
            defaultValue={chapter?.number}
            required 
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
            placeholder="e.g. 1 or 1.5" 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold">Chapter Title (Optional)</label>
          <input 
            name="title" 
            defaultValue={chapter?.title || ''}
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
            placeholder="e.g. The Beginning" 
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="isPublished"
          name="isPublished" 
          defaultChecked={chapter ? chapter.isPublished : true}
          value="true"
          className="h-4 w-4 rounded border-border bg-card text-primary"
        />
        <label htmlFor="isPublished" className="text-sm font-semibold">Published</label>
      </div>

      <hr className="border-border" />

      {sourceType === 'EXTERNAL' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">External Provider *</label>
              <select 
                name="externalProvider" 
                defaultValue={chapter?.externalProvider || 'TeraBox'}
                className="w-full rounded-lg border border-border bg-card px-4 py-2 font-medium"
              >
                {EXTERNAL_PROVIDERS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">External URL *</label>
              <input 
                name="externalUrl" 
                type="url"
                defaultValue={chapter?.externalUrl || ''}
                required={sourceType === 'EXTERNAL'}
                className="w-full rounded-lg border border-border bg-card px-4 py-2" 
                placeholder="https://terabox.com/s/..." 
              />
            </div>
          </div>
          
          <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-xl text-sm font-medium flex gap-3">
            <LinkIcon className="h-5 w-5 shrink-0" />
            <p>Users clicking this chapter will be directly redirected to the external URL instead of opening the built-in reader.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Chapter Pages ({images.length})</h2>
            {images.length > 0 && !showUploader && (
              <button 
                type="button" 
                onClick={() => setShowUploader(true)}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <RefreshCw className="h-4 w-4" /> Replace Entire Archive
              </button>
            )}
          </div>

          {showUploader && (
            <div className="p-6 bg-surface border border-border rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm">Upload New Archive</h3>
                {images.length > 0 && (
                  <button type="button" onClick={() => setShowUploader(false)} className="text-sm text-text-muted hover:text-text-primary">Cancel</button>
                )}
              </div>
              <ChapterUploader onUploadComplete={(urls: string[]) => {
                setImages(urls.map((url, i) => ({ id: `new-${Date.now()}-${i}`, url })));
                setShowUploader(false);
              }} />
            </div>
          )}

          {!showUploader && images.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images.map(i => i.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {images.map((img, index) => (
                    <SortableImage 
                      key={img.id} 
                      id={img.id} 
                      url={img.url} 
                      pageNumber={index + 1} 
                      onRemove={handleRemoveImage}
                      onReplace={handleReplaceImage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <div className="flex justify-end gap-4 border-t border-border pt-6">
        <button 
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? 'Saving...' : 'Save Chapter'}
        </button>
      </div>
    </form>
  );
}
