'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { createGenre, updateGenre, deleteGenre, createTag, updateTag, deleteTag } from '@/app/actions/admin/metadata';
import type { Genre, Tag } from '@prisma/client';

export function MetadataClient({ genres, tags }: { genres: Genre[]; tags: Tag[] }) {
  const [activeTab, setActiveTab] = useState<'genres' | 'tags'>('genres');
  
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const [isPending, setIsPending] = useState(false);

  // GENRE HANDLers
  const openNewGenre = () => { setEditingGenre(null); setIsGenreModalOpen(true); };
  const openEditGenre = (genre: Genre) => { setEditingGenre(genre); setIsGenreModalOpen(true); };
  
  const handleGenreSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      if (editingGenre) await updateGenre(editingGenre.id, formData);
      else await createGenre(formData);
      setIsGenreModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save genre');
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteGenre = async (id: string) => {
    if (!confirm('Are you sure you want to delete this genre?')) return;
    setIsPending(true);
    try {
      await deleteGenre(id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete genre');
    } finally {
      setIsPending(false);
    }
  };

  // TAG HANDLERS
  const openNewTag = () => { setEditingTag(null); setIsTagModalOpen(true); };
  const openEditTag = (tag: Tag) => { setEditingTag(tag); setIsTagModalOpen(true); };

  const handleTagSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      if (editingTag) await updateTag(editingTag.id, formData);
      else await createTag(formData);
      setIsTagModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save tag');
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    setIsPending(true);
    try {
      await deleteTag(id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete tag');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('genres')}
          className={`pb-3 px-2 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'genres' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Genres
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`pb-3 px-2 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'tags' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Tags
        </button>
      </div>

      {/* GENRES TAB */}
      {activeTab === 'genres' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Genres ({genres.length})</h2>
            <button
              onClick={openNewGenre}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Genre
            </button>
          </div>
          
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-text-secondary">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Slug</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {genres.map((genre) => (
                  <tr key={genre.id} className="hover:bg-surface/50">
                    <td className="px-6 py-4 font-semibold">
                      <div className="flex items-center gap-2">
                        {genre.color && (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: genre.color }} />
                        )}
                        {genre.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{genre.slug}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEditGenre(genre)} className="p-2 text-text-secondary hover:text-primary transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteGenre(genre.id)} disabled={isPending} className="p-2 text-text-secondary hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {genres.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-text-muted">No genres found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAGS TAB */}
      {activeTab === 'tags' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Tags ({tags.length})</h2>
            <button
              onClick={openNewTag}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Tag
            </button>
          </div>
          
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-text-secondary">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Slug</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-surface/50">
                    <td className="px-6 py-4 font-semibold">{tag.name}</td>
                    <td className="px-6 py-4 text-text-secondary">{tag.slug}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEditTag(tag)} className="p-2 text-text-secondary hover:text-primary transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteTag(tag.id)} disabled={isPending} className="p-2 text-text-secondary hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {tags.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-text-muted">No tags found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENRE MODAL */}
      {isGenreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingGenre ? 'Edit Genre' : 'Create Genre'}</h3>
              <button onClick={() => setIsGenreModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleGenreSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Name *</label>
                <input name="name" defaultValue={editingGenre?.name || ''} required className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Slug (Optional)</label>
                <input name="slug" defaultValue={editingGenre?.slug || ''} placeholder="Leave blank to auto-generate" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Color (Hex)</label>
                <input name="color" defaultValue={editingGenre?.color || ''} placeholder="#E53935" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Description</label>
                <textarea name="description" defaultValue={editingGenre?.description || ''} rows={2} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setIsGenreModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">Cancel</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {isPending ? 'Saving...' : 'Save Genre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAG MODAL */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingTag ? 'Edit Tag' : 'Create Tag'}</h3>
              <button onClick={() => setIsTagModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleTagSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Name *</label>
                <input name="name" defaultValue={editingTag?.name || ''} required className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Slug (Optional)</label>
                <input name="slug" defaultValue={editingTag?.slug || ''} placeholder="Leave blank to auto-generate" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setIsTagModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">Cancel</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {isPending ? 'Saving...' : 'Save Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
